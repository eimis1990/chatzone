'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { getBlogSourceBySlug } from '@/lib/blog'
import { getAllPosts } from '@/lib/blog'
import { BLOG_TOPICS } from '@/lib/blog-topics'
import {
  ARTICLE_GENERATION_MODEL,
  ARTICLE_IMAGE_MODEL,
  ARTICLE_PROMPT_VERSION,
  generateArticleCover,
  generateArticlePackage,
} from '@/lib/content-studio/generation'
import { assertContentStatusTransition, contentStatusAfterDraftEdit } from '@/lib/content-studio/lifecycle'
import { getArticleQualityChecks } from '@/lib/content-studio/quality'
import { getGitHubPullRequestStatus, publishContentToGitHub } from '@/lib/content-studio/publish/github'
import { normalizePublicationCover } from '@/lib/content-studio/publish/cover'
import { assertContentPublicationReady } from '@/lib/content-studio/publish/readiness'
import { getPublicationDecision } from '@/lib/content-studio/publish/reconcile'
import { SITE_URL } from '@/lib/site'
import type {
  ContentItem,
  ContentPublicationTarget,
  ContentSource,
  ContentStudioSettings,
  ContentStatus,
  ContentVariant,
  CreateContentItemInput,
  GenerateContentCoverResult,
  GenerateContentPackageResult,
  PublicationReconciliationResult,
  PublishContentResult,
  SaveContentStudioSettingsInput,
  UpdateContentDraftInput,
} from '@/lib/content-studio/types'
import {
  contentStatusSchema,
  createContentItemSchema,
  generateContentPackageSchema,
  saveContentStudioSettingsSchema,
  slugifyContentTitle,
  updateContentDraftSchema,
} from '@/lib/content-studio/validation'
import { createServiceClient } from '@/lib/supabase/service'

const CONTENT_PATH = '/owner/content'

function validationMessage(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? 'The content data is invalid'
}

export async function createContentItem(input: CreateContentItemInput): Promise<ContentItem> {
  const user = await requireRole('owner')
  const parsed = createContentItemSchema.safeParse(input)
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const refreshSource = parsed.data.mode === 'refresh' && parsed.data.refresh_slug
    ? getBlogSourceBySlug(parsed.data.refresh_slug)
    : null
  if (parsed.data.mode === 'refresh' && !refreshSource) {
    throw new Error('The article selected for refresh no longer exists')
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('content_items')
    .insert({
      created_by: user.id,
      mode: parsed.data.mode,
      title: parsed.data.title,
      slug: refreshSource?.slug ?? slugifyContentTitle(parsed.data.title),
      description: refreshSource?.data.description ?? '',
      target_query: parsed.data.target_query,
      topic: refreshSource?.data.topic ?? parsed.data.topic,
      search_intent: parsed.data.search_intent,
      reader_job: parsed.data.reader_job,
      refresh_slug: parsed.data.mode === 'refresh' ? parsed.data.refresh_slug : null,
      language: parsed.data.language,
      notes: parsed.data.notes,
      markdown: refreshSource?.body ?? '',
      related_slugs: refreshSource?.data.related
        ? refreshSource.data.related.split(',').map((slug) => slug.trim()).filter(Boolean)
        : [],
      cover_image_path: refreshSource?.data.image ?? null,
      status: 'idea',
    })
    .select('*')
    .single<ContentItem>()

  if (error || !data) {
    throw new Error(`Failed to create content item: ${error?.message ?? 'unknown error'}`)
  }

  revalidatePath(CONTENT_PATH)
  return data
}

export async function updateContentDraft(
  id: string,
  input: UpdateContentDraftInput,
): Promise<ContentItem> {
  const user = await requireRole('owner')
  const parsed = updateContentDraftSchema.safeParse(input)
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const { expectedRevision, ...draft } = parsed.data
  const service = createServiceClient()
  const { data: current, error: currentError } = await service
    .from('content_items')
    .select('status, revision, mode, slug')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle<{ status: ContentStatus; revision: number; mode: 'new' | 'refresh'; slug: string }>()
  if (currentError) throw new Error(`Failed to load draft: ${currentError.message}`)
  if (!current) throw new Error('Content item not found')
  if (current.revision !== expectedRevision) throw new Error('This draft changed in another session. Reload before saving again.')
  if (current.status === 'pr_open' || current.status === 'published') {
    throw new Error('This article is locked while its publishing pull request or live version is active')
  }
  // A refresh must keep targeting its source article: publishing to an edited
  // slug would overwrite whatever different article lives at that path.
  if (current.mode === 'refresh' && draft.slug !== current.slug) {
    throw new Error('A refresh keeps its original slug. Start a new article to publish under a different slug.')
  }

  const { data, error } = await service
    .from('content_items')
    .update({
      ...draft,
      status: contentStatusAfterDraftEdit(current.status),
      revision: expectedRevision + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('revision', expectedRevision)
    .eq('created_by', user.id)
    .select('*')
    .maybeSingle<ContentItem>()

  if (error) throw new Error(`Failed to save draft: ${error.message}`)
  if (!data) throw new Error('This draft changed in another session. Reload before saving again.')

  revalidatePath(CONTENT_PATH)
  revalidatePath(`${CONTENT_PATH}/${id}`)
  return data
}

export async function updateContentStatus(id: string, next: ContentStatus): Promise<ContentItem> {
  const user = await requireRole('owner')
  const parsedStatus = contentStatusSchema.safeParse(next)
  if (!parsedStatus.success) throw new Error('Unknown content status')

  const service = createServiceClient()
  const { data: current, error: readError } = await service
    .from('content_items')
    .select('status, revision')
    .eq('id', id)
    .eq('created_by', user.id)
    .maybeSingle<{ status: ContentStatus; revision: number }>()

  if (readError) throw new Error(`Failed to read content status: ${readError.message}`)
  if (!current) throw new Error('Content item not found')
  assertContentStatusTransition(current.status, parsedStatus.data)

  const now = new Date().toISOString()
  const { data, error } = await service
    .from('content_items')
    .update({
      status: parsedStatus.data,
      revision: current.revision + 1,
      updated_at: now,
      published_at: parsedStatus.data === 'published' ? now : undefined,
    })
    .eq('id', id)
    .eq('created_by', user.id)
    .eq('revision', current.revision)
    .select('*')
    .maybeSingle<ContentItem>()

  if (error) throw new Error(`Failed to update content status: ${error.message}`)
  if (!data) throw new Error('This draft changed in another session. Reload before changing status.')

  revalidatePath(CONTENT_PATH)
  revalidatePath(`${CONTENT_PATH}/${id}`)
  return data
}

export async function archiveContentItem(id: string): Promise<ContentItem> {
  return updateContentStatus(id, 'archived')
}

export async function saveContentStudioSettings(
  input: SaveContentStudioSettingsInput,
): Promise<{ settings: ContentStudioSettings; targets: ContentPublicationTarget[] }> {
  const user = await requireRole('owner')
  const parsed = saveContentStudioSettingsSchema.safeParse(input)
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const service = createServiceClient()
  const now = new Date().toISOString()
  const { data: settings, error: settingsError } = await service
    .from('content_studio_settings')
    .upsert({
      owner_id: user.id,
      proactive_suggestions: parsed.data.proactive_suggestions,
      default_approval_mode: parsed.data.default_approval_mode,
      updated_at: now,
    }, { onConflict: 'owner_id' })
    .select('*')
    .single<ContentStudioSettings>()

  if (settingsError || !settings) {
    throw new Error(`Failed to save Content Studio settings: ${settingsError?.message ?? 'unknown error'}`)
  }

  const { data: targets, error: targetsError } = await service
    .from('content_publication_targets')
    .upsert(parsed.data.targets.map((target) => ({
      owner_id: user.id,
      provider: target.provider,
      slot_key: target.slot_key,
      account_label: target.account_label,
      account_handle: target.account_handle,
      enabled: target.enabled,
      approval_mode: target.approval_mode,
      content_types: target.content_types,
      updated_at: now,
    })), { onConflict: 'owner_id,provider,slot_key' })
    .select('*')

  if (targetsError) {
    throw new Error(`The general settings were saved, but destinations failed: ${targetsError.message}`)
  }

  revalidatePath(CONTENT_PATH)
  revalidatePath(`${CONTENT_PATH}/settings`)
  return { settings, targets: (targets ?? []) as ContentPublicationTarget[] }
}

function messageFromUnknown(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown generation error'
}

export async function generateContentPackage(
  id: string,
  expectedRevision: number,
): Promise<GenerateContentPackageResult> {
  const user = await requireRole('owner')
  const parsed = generateContentPackageSchema.safeParse({ id, expectedRevision })
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const service = createServiceClient()
  const [{ data: item, error: itemError }, { data: targetRows, error: targetsError }] = await Promise.all([
    service
      .from('content_items')
      .select('*')
      .eq('id', parsed.data.id)
      .eq('created_by', user.id)
      .maybeSingle<ContentItem>(),
    service
      .from('content_publication_targets')
      .select('*')
      .eq('owner_id', user.id),
  ])
  if (itemError) throw new Error(`Failed to load article: ${itemError.message}`)
  if (!item) throw new Error('Content item not found')
  if (targetsError) throw new Error(`Failed to load publishing destinations: ${targetsError.message}`)
  if (item.revision !== parsed.data.expectedRevision) {
    throw new Error('This draft changed in another session. Reload before generating it again.')
  }
  if (item.status === 'published' || item.status === 'pr_open' || item.status === 'archived') {
    throw new Error(`A ${item.status.replace('_', ' ')} article cannot be regenerated`)
  }

  const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  await service
    .from('content_generation_runs')
    .update({
      status: 'failed',
      error_message: 'Generation timed out before completion',
      finished_at: new Date().toISOString(),
    })
    .eq('content_item_id', item.id)
    .in('operation', ['draft', 'image'])
    .in('status', ['queued', 'in_progress'])
    .lt('created_at', staleCutoff)

  const { data: run, error: runError } = await service
    .from('content_generation_runs')
    .insert({
      content_item_id: item.id,
      operation: 'draft',
      status: 'in_progress',
      model: ARTICLE_GENERATION_MODEL,
      prompt_version: ARTICLE_PROMPT_VERSION,
      input: {
        title: item.title,
        target_query: item.target_query,
        search_intent: item.search_intent,
        reader_job: item.reader_job,
        topic: item.topic,
        language: item.language,
        revision: item.revision,
      },
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>()

  if (runError || !run) {
    if (runError?.code === '23505') throw new Error('A draft generation is already running for this article')
    throw new Error(`Could not start article generation: ${runError?.message ?? 'unknown error'}`)
  }

  try {
    const generated = await generateArticlePackage(item, (targetRows ?? []) as ContentPublicationTarget[])
    const checks = getArticleQualityChecks({
      title: generated.title,
      description: generated.description,
      markdown: generated.markdown,
      relatedSlugs: generated.relatedSlugs,
      coverImageAlt: generated.coverImageAlt,
      coverImagePrompt: generated.coverImagePrompt,
      researchSourceUrls: generated.sources.map((source) => source.url),
    })

    const { data: updated, error: applyError } = await service
      .rpc('apply_content_generation_result', {
        p_content_item_id: item.id,
        p_expected_revision: item.revision,
        p_run_id: run.id,
        p_result: {
          title: generated.title,
          description: generated.description,
          markdown: generated.markdown,
          related_slugs: generated.relatedSlugs,
          cover_image_alt: generated.coverImageAlt,
          cover_image_prompt: generated.coverImagePrompt,
          cover_image_path: item.cover_image_path ?? '',
        },
        p_sources: generated.sources,
        p_variants: generated.variants,
        p_run_output: {
          usage: generated.usage,
          source_count: generated.sources.length,
          variant_providers: generated.variants.map((variant) => variant.provider),
          quality_checks: checks,
        },
      })
      .single()

    if (applyError || !updated) {
      throw new Error(`Could not save the generated package: ${applyError?.message ?? 'unknown error'}`)
    }

    revalidatePath(CONTENT_PATH)
    revalidatePath(`${CONTENT_PATH}/${item.id}`)
    return {
      item: updated as ContentItem,
      sources: generated.sources.map((source, index) => ({
        id: `generated-source-${index}`,
        content_item_id: item.id,
        created_at: new Date().toISOString(),
        ...source,
      })) as ContentSource[],
      variants: generated.variants.map((variant, index) => ({
        id: `generated-variant-${index}`,
        content_item_id: item.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...variant,
      })) as ContentVariant[],
      checks,
      coverImageUrl: item.cover_image_path?.startsWith('/blog/') ? item.cover_image_path : null,
      imageWarning: null,
    }
  } catch (error) {
    await service
      .from('content_generation_runs')
      .update({
        status: 'failed',
        error_message: messageFromUnknown(error).slice(0, 2000),
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)
    throw new Error(`Article generation failed: ${messageFromUnknown(error)}`)
  }
}

export async function generateContentCover(
  id: string,
  expectedRevision: number,
): Promise<GenerateContentCoverResult> {
  const user = await requireRole('owner')
  const parsed = generateContentPackageSchema.safeParse({ id, expectedRevision })
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const service = createServiceClient()
  const { data: item, error: itemError } = await service
    .from('content_items')
    .select('id, created_by, status, revision, cover_image_prompt')
    .eq('id', parsed.data.id)
    .eq('created_by', user.id)
    .maybeSingle<{ id: string; created_by: string; status: ContentStatus; revision: number; cover_image_prompt: string }>()
  if (itemError) throw new Error(`Failed to load the article cover brief: ${itemError.message}`)
  if (!item) throw new Error('Content item not found')
  if (item.status === 'published' || item.status === 'pr_open' || item.status === 'archived') {
    throw new Error(`A ${item.status.replace('_', ' ')} article cannot receive a new cover`)
  }
  if (item.revision !== parsed.data.expectedRevision) {
    throw new Error('This draft changed before its cover was generated. Retry the cover from the current draft.')
  }
  if (!item.cover_image_prompt.trim()) throw new Error('Generate or add a cover image brief first')

  const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  await service
    .from('content_generation_runs')
    .update({
      status: 'failed',
      error_message: 'Cover generation timed out before completion',
      finished_at: new Date().toISOString(),
    })
    .eq('content_item_id', item.id)
    .eq('operation', 'image')
    .in('status', ['queued', 'in_progress'])
    .lt('created_at', staleCutoff)

  const { data: imageRun, error: runError } = await service
    .from('content_generation_runs')
    .insert({
      content_item_id: item.id,
      operation: 'image',
      status: 'in_progress',
      model: ARTICLE_IMAGE_MODEL,
      prompt_version: ARTICLE_PROMPT_VERSION,
      input: { prompt: item.cover_image_prompt },
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  if (runError || !imageRun) {
    if (runError?.code === '23505') throw new Error('A cover image is already being generated for this article')
    throw new Error(`Could not start cover generation: ${runError?.message ?? 'unknown error'}`)
  }

  try {
    const imageResult = await generateArticleCover(item.cover_image_prompt)
    const coverImagePath = `${user.id}/${item.id}/cover.webp`
    const { error: uploadError } = await service.storage
      .from('content-studio')
      .upload(coverImagePath, imageResult.image.uint8Array, {
        contentType: imageResult.image.mediaType,
        upsert: true,
      })
    if (uploadError) throw uploadError

    const { data: updated, error: updateError } = await service
      .from('content_items')
      .update({
        cover_image_path: coverImagePath,
        revision: item.revision + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)
      .eq('created_by', user.id)
      .eq('revision', item.revision)
      .select('revision')
      .maybeSingle<{ revision: number }>()
    if (updateError || !updated) {
      throw new Error('The draft changed while its cover was generated. Reload before retrying.')
    }

    await service
      .from('content_generation_runs')
      .update({
        status: 'succeeded',
        output: { path: coverImagePath, media_type: imageResult.image.mediaType },
        finished_at: new Date().toISOString(),
      })
      .eq('id', imageRun.id)

    const { data: signed, error: signedError } = await service.storage
      .from('content-studio')
      .createSignedUrl(coverImagePath, 60 * 60)
    if (signedError || !signed?.signedUrl) throw new Error('The cover was saved but its preview URL could not be created')

    revalidatePath(CONTENT_PATH)
    revalidatePath(`${CONTENT_PATH}/${item.id}`)
    return { coverImagePath, coverImageUrl: signed.signedUrl, revision: updated.revision }
  } catch (error) {
    await service
      .from('content_generation_runs')
      .update({
        status: 'failed',
        error_message: messageFromUnknown(error).slice(0, 2000),
        finished_at: new Date().toISOString(),
      })
      .eq('id', imageRun.id)
    throw new Error(`Cover generation failed: ${messageFromUnknown(error)}`)
  }
}

export async function publishContentToDraftPullRequest(
  id: string,
  expectedRevision: number,
): Promise<PublishContentResult> {
  const user = await requireRole('owner')
  const parsed = generateContentPackageSchema.safeParse({ id, expectedRevision })
  if (!parsed.success) throw new Error(validationMessage(parsed.error))

  const service = createServiceClient()
  const [{ data: item, error: itemError }, { data: sourceRows, error: sourcesError }] = await Promise.all([
    service
      .from('content_items')
      .select('*')
      .eq('id', parsed.data.id)
      .eq('created_by', user.id)
      .maybeSingle<ContentItem>(),
    service
      .from('content_sources')
      .select('*')
      .eq('content_item_id', parsed.data.id),
  ])
  if (itemError) throw new Error(`Failed to load the article: ${itemError.message}`)
  if (!item) throw new Error('Content item not found')
  if (sourcesError) throw new Error(`Failed to load article sources: ${sourcesError.message}`)
  if (item.revision !== parsed.data.expectedRevision) {
    throw new Error('This article changed in another session. Reload before creating its pull request.')
  }

  const sources = (sourceRows ?? []) as ContentSource[]
  const checks = assertContentPublicationReady(
    item,
    sources,
    new Set(getAllPosts().map((post) => post.slug)),
    new Set(BLOG_TOPICS.map((topic) => topic.slug)),
  )

  let cover: { bytes: Uint8Array; mediaType: 'image/webp' } | null = null
  const expectedPrivatePath = `${user.id}/${item.id}/cover.webp`
  if (item.cover_image_path === expectedPrivatePath) {
    const { data: coverBlob, error: coverError } = await service.storage
      .from('content-studio')
      .download(expectedPrivatePath)
    if (coverError || !coverBlob) throw new Error(`Could not load the approved cover: ${coverError?.message ?? 'missing file'}`)
    cover = {
      bytes: await normalizePublicationCover(new Uint8Array(await coverBlob.arrayBuffer())),
      mediaType: 'image/webp',
    }
  } else if (!(item.mode === 'refresh' && item.cover_image_path === `/blog/${item.slug}.webp`)) {
    throw new Error('The approved cover does not belong to this article. Generate or approve it again.')
  }

  const staleCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString()
  await service
    .from('content_generation_runs')
    .update({
      status: 'failed',
      error_message: 'Publishing timed out before completion',
      finished_at: new Date().toISOString(),
    })
    .eq('content_item_id', item.id)
    .eq('operation', 'publish')
    .in('status', ['queued', 'in_progress'])
    .lt('created_at', staleCutoff)

  const { data: run, error: runError } = await service
    .from('content_generation_runs')
    .insert({
      content_item_id: item.id,
      operation: 'publish',
      status: 'in_progress',
      model: 'github-rest',
      prompt_version: 'github-publication-v1',
      input: { slug: item.slug, revision: item.revision, mode: item.mode },
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  if (runError || !run) {
    if (runError?.code === '23505') throw new Error('A publishing pull request is already being created for this article')
    throw new Error(`Could not start publishing: ${runError?.message ?? 'unknown error'}`)
  }

  try {
    const publication = await publishContentToGitHub({ item, sources, checks, cover })
    const { data: updated, error: applyError } = await service
      .rpc('apply_content_publication_result', {
        p_content_item_id: item.id,
        p_expected_revision: item.revision,
        p_run_id: run.id,
        p_pull_request_url: publication.pullRequestUrl,
        p_pull_request_number: publication.pullRequestNumber,
        p_publication_branch: publication.branch,
        p_publication_commit_sha: publication.commitSha,
        p_publication_base_sha: publication.baseSha,
        p_run_output: publication,
      })
      .single()
    if (applyError || !updated) {
      throw new Error(`GitHub created the draft PR, but the portal could not save it: ${applyError?.message ?? 'unknown error'}. Retry to recover the same open PR.`)
    }

    revalidatePath(CONTENT_PATH)
    revalidatePath(`${CONTENT_PATH}/${item.id}`)
    return { item: updated as ContentItem, reused: publication.reused }
  } catch (error) {
    await service
      .from('content_generation_runs')
      .update({
        status: 'failed',
        error_message: messageFromUnknown(error).slice(0, 2000),
        finished_at: new Date().toISOString(),
      })
      .eq('id', run.id)
    throw new Error(`Publishing failed: ${messageFromUnknown(error)}`)
  }
}

export async function reconcileContentPublication(id: string): Promise<PublicationReconciliationResult> {
  const user = await requireRole('owner')
  const parsed = generateContentPackageSchema.shape.id.safeParse(id)
  if (!parsed.success) throw new Error('Invalid content item ID')

  const service = createServiceClient()
  const { data: item, error: itemError } = await service
    .from('content_items')
    .select('*')
    .eq('id', parsed.data)
    .eq('created_by', user.id)
    .maybeSingle<ContentItem>()
  if (itemError) throw new Error(`Failed to load publication status: ${itemError.message}`)
  if (!item) throw new Error('Content item not found')
  if (item.status !== 'pr_open' || !item.pull_request_number) {
    return { item, message: 'No open publishing pull request to reconcile' }
  }

  const pull = await getGitHubPullRequestStatus(item.pull_request_number)
  if (pull.state === 'closed' && !pull.merged) {
    const decision = getPublicationDecision(pull, false)
    const { data: returned, error: returnError } = await service
      .from('content_items')
      .update({ status: 'ready', revision: item.revision + 1, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('revision', item.revision)
      .select('*')
      .maybeSingle<ContentItem>()
    if (returnError || !returned) throw new Error('The PR closed, but the article changed before it could return to Ready')
    revalidatePath(CONTENT_PATH)
    revalidatePath(`${CONTENT_PATH}/${item.id}`)
    return { item: returned, message: decision.message }
  }

  const publishedUrl = `${SITE_URL}/blog/${item.slug}`
  let live = false
  if (pull.merged) {
    try {
      const response = await fetch(publishedUrl, {
        method: 'GET',
        headers: { Accept: 'text/html' },
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      })
      live = response.ok
    } catch {
      live = false
    }
  }
  const decision = getPublicationDecision(pull, live)
  if (decision.nextStatus === 'pr_open') return { item, message: decision.message }

  const now = new Date().toISOString()
  const { data: published, error: publishError } = await service
    .from('content_items')
    .update({
      status: 'published',
      published_url: publishedUrl,
      published_at: now,
      publication_commit_sha: pull.headSha,
      revision: item.revision + 1,
      updated_at: now,
    })
    .eq('id', item.id)
    .eq('revision', item.revision)
    .select('*')
    .maybeSingle<ContentItem>()
  if (publishError || !published) throw new Error('The article is live, but its portal status changed before reconciliation finished')

  revalidatePath(CONTENT_PATH)
  revalidatePath(`${CONTENT_PATH}/${item.id}`)
  return { item: published, message: decision.message }
}
