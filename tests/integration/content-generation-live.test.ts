import { describe, expect, it } from 'vitest'
import { generateArticleCover, generateArticlePackage } from '@/lib/content-studio/generation'
import { getArticleQualityChecks } from '@/lib/content-studio/quality'
import type { ContentItem, ContentPublicationTarget } from '@/lib/content-studio/types'

const live = process.env.RUN_LIVE_CONTENT_GENERATION === 'true' ? describe.sequential : describe.skip

live('Content Studio live generation', () => {
  let coverPrompt = ''

  it('researches, writes, and adapts a review-ready package', async () => {
    const now = new Date().toISOString()
    const item: ContentItem = {
      id: '00000000-0000-4000-8000-000000000001',
      created_by: '00000000-0000-4000-8000-000000000002',
      mode: 'new',
      status: 'idea',
      title: 'How AI product discovery handles vague shopper language',
      slug: 'ai-product-discovery-vague-shopper-language',
      description: '',
      topic: 'ecommerce-ai',
      target_query: 'AI product discovery vague shopper language',
      search_intent: 'Informational: understand how semantic product discovery interprets ambiguous requests',
      reader_job: 'Decide whether an AI product discovery layer can improve a store with inconsistent catalog language',
      refresh_slug: null,
      language: 'en',
      notes: 'Be practical, evidence-led, and precise about limitations. Do not invent Loqara capabilities.',
      markdown: '',
      related_slugs: [],
      cover_image_path: null,
      cover_image_alt: '',
      cover_image_prompt: '',
      pull_request_url: null,
      pull_request_number: null,
      publication_branch: null,
      publication_commit_sha: null,
      publication_base_sha: null,
      published_url: null,
      revision: 1,
      created_at: now,
      updated_at: now,
      published_at: null,
    }
    const targets: ContentPublicationTarget[] = [{
      id: null,
      owner_id: item.created_by,
      provider: 'linkedin',
      slot_key: 'default',
      account_label: 'Loqara',
      account_handle: '',
      enabled: true,
      approval_mode: 'review',
      content_types: ['social_post'],
      connector_status: 'not_connected',
      connector_account_id: null,
      connector_error: null,
      created_at: null,
      updated_at: null,
    }]

    const generated = await generateArticlePackage(item, targets)
    const checks = getArticleQualityChecks({
      title: generated.title,
      description: generated.description,
      markdown: generated.markdown,
      relatedSlugs: generated.relatedSlugs,
      coverImageAlt: generated.coverImageAlt,
      coverImagePrompt: generated.coverImagePrompt,
      researchSourceUrls: generated.sources.map((source) => source.url),
    })

    expect(generated.sources.length).toBeGreaterThanOrEqual(3)
    expect(generated.variants).toHaveLength(1)
    expect(generated.variants[0].provider).toBe('linkedin')
    expect(checks.filter((check) => check.severity === 'required' && !check.passed)).toEqual([])

    coverPrompt = generated.coverImagePrompt
  }, 300_000)

  it('illustrates the generated cover brief', async () => {
    expect(coverPrompt.length).toBeGreaterThan(40)
    const cover = await generateArticleCover(coverPrompt)
    expect(cover.image.uint8Array.byteLength).toBeGreaterThan(10_000)
    expect(cover.image.mediaType).toBe('image/webp')
  }, 300_000)
})
