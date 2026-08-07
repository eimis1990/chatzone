'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CircleIcon,
  CopyIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  EyeIcon,
  FileTextIcon,
  GitPullRequestCreateIcon,
  Maximize2Icon,
  Minimize2Icon,
  RefreshCwIcon,
  SaveIcon,
  SparklesIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { archiveContentItem, generateContentCover, generateContentPackage, publishContentToDraftPullRequest, reconcileContentPublication, updateContentDraft, updateContentStatus } from '@/app/(owner)/owner/content/actions'
import { ContentStudioGuide, ContentStudioHeader, lifecycleStageForStatus } from '@/components/owner/content/ContentStudioChrome'
import { DestinationLogo } from '@/components/owner/content/DestinationLogo'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { renderBlogMarkdown } from '@/lib/blog-render'
import { CONTENT_STATUS_LABELS } from '@/lib/content-studio/lifecycle'
import { getArticleQualityChecks } from '@/lib/content-studio/quality'
import type { ContentItem, ContentSource, ContentStatus, ContentVariant, UpdateContentDraftInput } from '@/lib/content-studio/types'
import { cn } from '@/lib/utils'

interface TopicOption { slug: string; name: string }
type SaveState = 'saved' | 'unsaved' | 'saving' | 'error'
type DraftFields = Omit<UpdateContentDraftInput, 'expectedRevision'>

function draftFromItem(item: ContentItem): DraftFields {
  return {
    title: item.title,
    slug: item.slug,
    description: item.description,
    topic: item.topic,
    target_query: item.target_query,
    search_intent: item.search_intent,
    reader_job: item.reader_job,
    notes: item.notes,
    markdown: item.markdown,
    related_slugs: item.related_slugs,
    cover_image_alt: item.cover_image_alt,
    cover_image_prompt: item.cover_image_prompt,
  }
}

function nextStep(status: ContentStatus): { status: ContentStatus; label: string } | null {
  if (status === 'idea' || status === 'brief') return { status: 'drafting', label: 'Start drafting' }
  if (status === 'drafting') return { status: 'review', label: 'Send to review' }
  if (status === 'review') return { status: 'ready', label: 'Mark ready' }
  if (status === 'ready') return { status: 'review', label: 'Return to review' }
  if (status === 'failed') return { status: 'drafting', label: 'Resume drafting' }
  if (status === 'archived') return { status: 'idea', label: 'Restore to ideas' }
  return null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

function providerName(provider: ContentVariant['provider']): string {
  return provider === 'linkedin' ? 'LinkedIn' : provider === 'facebook' ? 'Facebook' : 'Instagram'
}

function ArticlePreview({
  title,
  description,
  topic,
  coverImageUrl,
  coverImageAlt,
  markdown,
  renderedHtml,
  className,
}: {
  title: string
  description: string
  topic: string
  coverImageUrl: string | null
  coverImageAlt: string
  markdown: string
  renderedHtml: string
  className?: string
}) {
  return (
    <article className={cn('mx-auto w-full max-w-[52rem] rounded-xl border bg-background px-5 py-8 shadow-sm sm:px-10', className)}>
      <header className="mb-8 grid gap-3 border-b pb-6">
        <Badge variant="outline" className="w-fit">{topic}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{title || 'Untitled article'}</h1>
        {description && <p className="text-base leading-relaxed text-gray-600">{description}</p>}
      </header>
      {coverImageUrl && (
        <figure className="mb-8 overflow-hidden rounded-xl border bg-muted">
          {/* Private signed Storage URLs are deliberately rendered without Next's public remote-image allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImageUrl} alt={coverImageAlt} className="aspect-[3/2] w-full object-cover" />
        </figure>
      )}
      {markdown ? (
        <div className="article" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      ) : (
        <div className="grid min-h-64 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">The article preview will appear here.</div>
      )}
    </article>
  )
}

function guideCopy(status: ContentStatus, pullRequestNumber: number | null): { eyebrow: string; title: string; description: string } {
  if (status === 'review') return { eyebrow: 'Recommended next', title: 'Review the draft and clear required checks', description: 'Check the article, sources, cover, and destination drafts before marking this package ready.' }
  if (status === 'ready') return { eyebrow: 'Ready for handoff', title: 'Create the review pull request', description: 'The Studio will prepare a draft GitHub PR. Nothing merges or publishes without your final review.' }
  if (status === 'pr_open') return { eyebrow: 'Review in progress', title: `Draft PR${pullRequestNumber ? ` #${pullRequestNumber}` : ''} is waiting in GitHub`, description: 'Review and merge in GitHub when ready, then refresh here to confirm the live article.' }
  if (status === 'published') return { eyebrow: 'Published', title: 'This article is live', description: 'The Studio has confirmed the merged article is available on the public website.' }
  if (status === 'failed') return { eyebrow: 'Needs attention', title: 'Resume the draft safely', description: 'Your work is saved. Continue drafting or regenerate the package before it returns to review.' }
  if (status === 'archived') return { eyebrow: 'Archived', title: 'Restore this article when you are ready', description: 'Archived work remains private and can return to Ideas without losing its draft.' }
  if (status === 'drafting') return { eyebrow: 'Recommended next', title: 'Finish the article package', description: 'Refine the draft and clear the required checks, then send the complete package to review.' }
  return { eyebrow: 'Recommended next', title: 'Build the article package', description: 'Let the Studio research, write, and prepare destination drafts, then review everything in this workspace.' }
}

export function ArticleWorkspace({
  initialItem,
  initialSources,
  initialVariants,
  initialCoverImageUrl,
  publicationConfigured,
  topics,
}: {
  initialItem: ContentItem
  initialSources: ContentSource[]
  initialVariants: ContentVariant[]
  initialCoverImageUrl: string | null
  publicationConfigured: boolean
  topics: TopicOption[]
}) {
  const [item, setItem] = useState(initialItem)
  const [draft, setDraft] = useState<DraftFields>(() => draftFromItem(initialItem))
  const [sources, setSources] = useState(initialSources)
  const [variants, setVariants] = useState(initialVariants)
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState('')
  const [statusPending, setStatusPending] = useState(false)
  const [generationPending, setGenerationPending] = useState(false)
  const [coverPending, setCoverPending] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [imageWarning, setImageWarning] = useState('')
  const [generationConfirmOpen, setGenerationConfirmOpen] = useState(false)
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false)
  const [publishPending, setPublishPending] = useState(false)
  const [reconcilePending, setReconcilePending] = useState(false)
  const [publicationError, setPublicationError] = useState('')
  const [publicationMessage, setPublicationMessage] = useState('')
  const [activeTab, setActiveTab] = useState('write')
  const [previewFullscreenOpen, setPreviewFullscreenOpen] = useState(false)
  const [showAllSources, setShowAllSources] = useState(false)
  const revisionRef = useRef(initialItem.revision)
  const lastSavedRef = useRef(JSON.stringify(draftFromItem(initialItem)))
  const savingRef = useRef(false)
  const queuedRef = useRef<string | null>(null)
  const draftRef = useRef(draft)

  useEffect(() => { draftRef.current = draft }, [draft])

  useEffect(() => {
    if (item.status !== 'pr_open' || !item.pull_request_number || !publicationConfigured) return
    let cancelled = false
    queueMicrotask(() => { if (!cancelled) setReconcilePending(true) })
    void reconcileContentPublication(item.id)
      .then((result) => {
        if (cancelled) return
        revisionRef.current = result.item.revision
        setItem(result.item)
        setPublicationMessage(result.message)
      })
      .catch((error) => {
        if (!cancelled) setPublicationError(errorMessage(error))
      })
      .finally(() => {
        if (!cancelled) setReconcilePending(false)
      })
    return () => { cancelled = true }
  }, [item.id, item.pull_request_number, item.status, publicationConfigured])

  const persist = useCallback(async (serialized: string): Promise<boolean> => {
    if (serialized === lastSavedRef.current) {
      setSaveState('saved')
      return true
    }
    if (savingRef.current) {
      queuedRef.current = serialized
      return true
    }

    savingRef.current = true
    setSaveState('saving')
    setSaveError('')
    try {
      const fields = JSON.parse(serialized) as DraftFields
      const updated = await updateContentDraft(initialItem.id, {
        ...fields,
        expectedRevision: revisionRef.current,
      })
      revisionRef.current = updated.revision
      lastSavedRef.current = serialized
      setItem(updated)
      setSaveState('saved')
      return true
    } catch (error) {
      const message = errorMessage(error)
      setSaveError(message)
      setSaveState('error')
      queuedRef.current = null
      return false
    } finally {
      savingRef.current = false
      const queued = queuedRef.current
      queuedRef.current = null
      if (queued && queued !== lastSavedRef.current) queueMicrotask(() => void persist(queued))
    }
  }, [initialItem.id])

  useEffect(() => {
    const serialized = JSON.stringify(draft)
    if (serialized === lastSavedRef.current) return
    setSaveState('unsaved')
    const timer = setTimeout(() => void persist(serialized), 900)
    return () => clearTimeout(timer)
  }, [draft, persist])

  function change<K extends keyof DraftFields>(key: K, value: DraftFields[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const rendered = useMemo(() => renderBlogMarkdown(draft.markdown), [draft.markdown])
  const checks = useMemo(() => getArticleQualityChecks({
    title: draft.title,
    description: draft.description,
    markdown: draft.markdown,
    relatedSlugs: draft.related_slugs,
    coverImageAlt: draft.cover_image_alt,
    coverImagePrompt: draft.cover_image_prompt,
    researchSourceUrls: sources.map((source) => source.url),
  }), [draft, sources])
  const requiredReady = checks.filter((check) => check.severity === 'required').every((check) => check.passed)
  const action = nextStep(item.status)
  const wordCount = draft.markdown.trim() ? draft.markdown.trim().split(/\s+/).length : 0
  const generationBusy = generationPending || coverPending
  const publicationLocked = item.status === 'pr_open' || item.status === 'published'
  const workspaceBusy = generationBusy || publishPending || reconcilePending || statusPending
  const topicName = topics.find((topic) => topic.slug === draft.topic)?.name ?? draft.topic

  async function saveNow() {
    await persist(JSON.stringify(draftRef.current))
  }

  async function createCover(expectedRevision = revisionRef.current) {
    setCoverPending(true)
    setImageWarning('')
    try {
      const cover = await generateContentCover(item.id, expectedRevision)
      revisionRef.current = cover.revision
      setItem((current) => ({ ...current, revision: cover.revision, cover_image_path: cover.coverImagePath }))
      setCoverImageUrl(cover.coverImageUrl)
      toast.success('Cover image created')
    } catch (error) {
      const warning = `The article is safely saved, but its cover needs a retry. ${errorMessage(error)}`
      setImageWarning(warning)
      toast.warning(warning)
    } finally {
      setCoverPending(false)
    }
  }

  async function publishDraftPullRequest() {
    setPublishConfirmOpen(false)
    if (saveState === 'unsaved') {
      const saved = await persist(JSON.stringify(draftRef.current))
      if (!saved) return
    }
    if (saveState === 'error') return

    setPublishPending(true)
    setPublicationError('')
    setPublicationMessage('')
    try {
      const result = await publishContentToDraftPullRequest(item.id, revisionRef.current)
      revisionRef.current = result.item.revision
      setItem(result.item)
      setPublicationMessage(result.reused ? 'Recovered the existing open draft PR.' : 'Draft PR created. Review and merge it in GitHub when ready.')
      toast.success(result.reused ? 'Existing draft PR recovered' : 'Draft publishing PR created')
    } catch (error) {
      const message = errorMessage(error)
      setPublicationError(message)
      toast.error(message)
    } finally {
      setPublishPending(false)
    }
  }

  async function refreshPublicationStatus() {
    setReconcilePending(true)
    setPublicationError('')
    try {
      const result = await reconcileContentPublication(item.id)
      revisionRef.current = result.item.revision
      setItem(result.item)
      setPublicationMessage(result.message)
      toast.success(result.message)
    } catch (error) {
      const message = errorMessage(error)
      setPublicationError(message)
      toast.error(message)
    } finally {
      setReconcilePending(false)
    }
  }

  async function generatePackage() {
    setGenerationConfirmOpen(false)
    if (saveState === 'unsaved') {
      const saved = await persist(JSON.stringify(draftRef.current))
      if (!saved) return
    }
    if (saveState === 'error') return

    setGenerationPending(true)
    setGenerationError('')
    setImageWarning('')
    try {
      const result = await generateContentPackage(item.id, revisionRef.current)
      const nextDraft = draftFromItem(result.item)
      revisionRef.current = result.item.revision
      draftRef.current = nextDraft
      lastSavedRef.current = JSON.stringify(nextDraft)
      setItem(result.item)
      setDraft(nextDraft)
      setSources(result.sources)
      setVariants(result.variants)
      setCoverImageUrl(result.coverImageUrl)
      setSaveState('saved')
      const passed = result.checks.filter((check) => check.passed).length
      toast.success(`Article package saved · ${passed}/${result.checks.length} quality checks passed`)

      await createCover(result.item.revision)
    } catch (error) {
      const message = errorMessage(error)
      setGenerationError(message)
      toast.error(message)
    } finally {
      setGenerationPending(false)
    }
  }

  function requestGeneration() {
    if (draft.markdown.trim()) setGenerationConfirmOpen(true)
    else void generatePackage()
  }

  async function copyVariant(variant: ContentVariant) {
    await navigator.clipboard.writeText(`${variant.body}\n\n${variant.hashtags.map((tag) => `#${tag}`).join(' ')}`.trim())
    toast.success(`${variant.provider[0].toUpperCase()}${variant.provider.slice(1)} draft copied`)
  }

  async function moveStatus(next: ContentStatus) {
    if (saveState === 'unsaved') {
      const saved = await persist(JSON.stringify(draftRef.current))
      if (!saved) return
    }
    if (saveState === 'error') return
    setStatusPending(true)
    try {
      const updated = await updateContentStatus(item.id, next)
      revisionRef.current = updated.revision
      setItem(updated)
      toast.success(`Moved to ${CONTENT_STATUS_LABELS[next].toLowerCase()}`)
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setStatusPending(false)
    }
  }

  async function archive() {
    if (!window.confirm('Archive this article? You can restore it to Ideas later.')) return
    setStatusPending(true)
    try {
      const updated = await archiveContentItem(item.id)
      revisionRef.current = updated.revision
      setItem(updated)
      toast.success('Article archived')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      setStatusPending(false)
    }
  }

  const guidance = guideCopy(item.status, item.pull_request_number)
  const guideAction = (() => {
    if (item.status === 'ready') {
      return (
        <Button variant="inverse" size="lg" onClick={() => setPublishConfirmOpen(true)} disabled={workspaceBusy || !publicationConfigured || saveState === 'saving'}>
          {publishPending ? <Spinner /> : <GitPullRequestCreateIcon data-icon="inline-start" />}
          {publishPending ? 'Creating draft PR…' : 'Create draft PR'}
        </Button>
      )
    }
    if (item.status === 'pr_open') {
      return <Button variant="inverse" size="lg" onClick={() => void refreshPublicationStatus()} disabled={workspaceBusy}>{reconcilePending ? <Spinner /> : <RefreshCwIcon data-icon="inline-start" />} Refresh PR status</Button>
    }
    if (item.status === 'published' && item.published_url) {
      return <a href={item.published_url} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'inverse', size: 'lg' }), 'min-h-11')}>Open live article <ExternalLinkIcon data-icon="inline-end" /></a>
    }
    if (action) {
      return (
        <Button variant="inverse" size="lg" onClick={() => void moveStatus(action.status)} disabled={workspaceBusy || saveState === 'saving' || ((action.status === 'review' || action.status === 'ready') && !requiredReady)}>
          {statusPending && <Spinner />}{action.label}
        </Button>
      )
    }
    return undefined
  })()

  return (
    <div className="mx-auto grid max-w-[110rem] gap-4">
      <ContentStudioHeader
        title={draft.title || 'Untitled article'}
        badge={CONTENT_STATUS_LABELS[item.status]}
        backHref="/owner/content"
        description={saveState === 'saving' ? 'Saving changes…' : saveState === 'saved' ? 'All changes saved' : saveState === 'unsaved' ? 'Unsaved changes' : 'Save failed — your latest changes need attention'}
        actions={(
          <>
          <Button variant="outline" onClick={requestGeneration} disabled={workspaceBusy || publicationLocked || saveState === 'saving'}>
            {generationPending ? <Spinner /> : <SparklesIcon data-icon="inline-start" />}
            {generationPending ? 'Researching & writing…' : draft.markdown.trim() ? 'Regenerate package' : 'Generate article package'}
          </Button>
          <Button variant="outline" onClick={() => void saveNow()} disabled={workspaceBusy || publicationLocked || saveState === 'saving' || saveState === 'saved'}>
            {saveState === 'saving' ? <Spinner /> : <SaveIcon data-icon="inline-start" />} Save now
          </Button>
          {item.status === 'ready' && <Button variant="outline" onClick={() => void moveStatus('review')} disabled={workspaceBusy}>Return to review</Button>}
          {item.status !== 'archived' && <Button variant="ghost" size="icon" onClick={() => void archive()} disabled={workspaceBusy} aria-label="Archive article"><ArchiveIcon /></Button>}
          </>
        )}
      />

      <ContentStudioGuide
        icon={item.status === 'pr_open' || item.status === 'ready' ? GitPullRequestCreateIcon : SparklesIcon}
        eyebrow={guidance.eyebrow}
        title={guidance.title}
        description={guidance.description}
        currentStage={lifecycleStageForStatus(item.status)}
        action={guideAction}
      />

      {saveError && <Alert variant="destructive"><AlertTitle>Draft not saved</AlertTitle><AlertDescription>{saveError}</AlertDescription></Alert>}
      {generationPending && <Alert><Spinner /><AlertTitle>Building the article package</AlertTitle><AlertDescription>Researching current sources, writing the article and destination drafts, then creating a private cover image. Keep this page open.</AlertDescription></Alert>}
      {coverPending && !generationPending && <Alert><Spinner /><AlertTitle>Creating the cover</AlertTitle><AlertDescription>The article is already saved. Keep this page open while its private cover image is generated.</AlertDescription></Alert>}
      {generationError && <Alert variant="destructive"><AlertTitle>Generation failed</AlertTitle><AlertDescription>{generationError}</AlertDescription></Alert>}
      {imageWarning && <Alert><AlertTitle>Cover needs attention</AlertTitle><AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"><span>{imageWarning}</span><Button variant="outline" size="sm" onClick={() => void createCover()} disabled={generationBusy}>Retry cover</Button></AlertDescription></Alert>}
      {publishPending && <Alert><Spinner /><AlertTitle>Creating the review branch and draft PR</AlertTitle><AlertDescription>The article and approved cover are being committed together. Nothing is being merged or published to production.</AlertDescription></Alert>}
      {reconcilePending && <Alert><Spinner /><AlertTitle>Checking GitHub and the live article</AlertTitle><AlertDescription>Content Studio is reconciling the pull request without changing it.</AlertDescription></Alert>}
      {publicationError && <Alert variant="destructive"><AlertTitle>Publishing needs attention</AlertTitle><AlertDescription>{publicationError}</AlertDescription></Alert>}
      {publicationMessage && <Alert><GitPullRequestCreateIcon aria-hidden="true" /><AlertTitle>Publication status</AlertTitle><AlertDescription>{publicationMessage}</AlertDescription></Alert>}
      {item.status === 'ready' && !publicationConfigured && <Alert><AlertTitle>GitHub publishing is not configured</AlertTitle><AlertDescription>Add the server-only Content Studio GitHub token, repository, and base branch before creating a draft PR.</AlertDescription></Alert>}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="gap-0 overflow-hidden py-0 shadow-sm">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-0">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <TabsList variant="line">
                <TabsTrigger value="write"><FileTextIcon data-icon="inline-start" /> Write</TabsTrigger>
                <TabsTrigger value="preview"><EyeIcon data-icon="inline-start" /> Preview</TabsTrigger>
                {variants.length > 0 && <TabsTrigger value="destinations">Destinations <Badge variant="secondary">{variants.length}</Badge></TabsTrigger>}
              </TabsList>
              <div className="flex items-center gap-2">
                <span className="hidden text-xs text-muted-foreground sm:inline">{wordCount.toLocaleString()} words</span>
                {activeTab === 'preview' && (
                  <Button variant="outline" size="sm" onClick={() => setPreviewFullscreenOpen(true)}>
                    <Maximize2Icon data-icon="inline-start" /> Full screen
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="write" className="p-4 sm:p-5">
              <fieldset disabled={workspaceBusy || publicationLocked} className="contents">
                <FieldGroup className="mx-auto max-w-5xl">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field><FieldLabel htmlFor="studio-title">Article title</FieldLabel><Input id="studio-title" value={draft.title} onChange={(event) => change('title', event.target.value)} maxLength={180} /></Field>
                  <Field><FieldLabel htmlFor="studio-slug">URL slug</FieldLabel><Input id="studio-slug" value={draft.slug} onChange={(event) => change('slug', event.target.value.toLowerCase())} placeholder="article-url-slug" maxLength={120} /><FieldDescription>/blog/{draft.slug || 'article-url-slug'}</FieldDescription></Field>
                </div>
                <Field><FieldLabel htmlFor="studio-description">Meta description</FieldLabel><Textarea id="studio-description" value={draft.description} onChange={(event) => change('description', event.target.value)} className="min-h-20" maxLength={320} /><FieldDescription>{draft.description.length}/320 characters</FieldDescription></Field>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field><FieldLabel htmlFor="studio-topic">Topic cluster</FieldLabel><Select value={draft.topic} onValueChange={(value) => value && change('topic', value)}><SelectTrigger id="studio-topic" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{topics.map((topic) => <SelectItem key={topic.slug} value={topic.slug}>{topic.name}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                  <Field><FieldLabel htmlFor="studio-query">Target query</FieldLabel><Input id="studio-query" value={draft.target_query} onChange={(event) => change('target_query', event.target.value)} maxLength={180} /></Field>
                </div>
                <Field><FieldLabel htmlFor="studio-intent">Search intent</FieldLabel><Input id="studio-intent" value={draft.search_intent} onChange={(event) => change('search_intent', event.target.value)} maxLength={240} /></Field>
                <Field><FieldLabel htmlFor="studio-reader-job">Reader outcome</FieldLabel><Textarea id="studio-reader-job" value={draft.reader_job} onChange={(event) => change('reader_job', event.target.value)} className="min-h-20" maxLength={500} /></Field>
                <Field><FieldLabel htmlFor="studio-body">Article body</FieldLabel><Textarea id="studio-body" value={draft.markdown} onChange={(event) => change('markdown', event.target.value)} className="h-[calc(100svh-10rem)] min-h-[28rem] field-sizing-fixed resize-none overflow-y-auto overscroll-contain font-mono text-sm leading-relaxed" placeholder={'<blockquote class="quick-answer">Direct answer…</blockquote>\n\n## What the reader needs to know\n\nStart writing here…'} maxLength={200000} /><FieldDescription>The editor stays one screen tall and scrolls internally. Markdown and the existing Loqara article callout HTML are supported.</FieldDescription></Field>
                <Field><FieldLabel htmlFor="studio-related">Related article slugs</FieldLabel><Input id="studio-related" value={draft.related_slugs.join(', ')} onChange={(event) => change('related_slugs', event.target.value.split(',').map((value) => value.trim()).filter(Boolean))} placeholder="first-guide, second-guide" /><FieldDescription>Comma-separated slugs used by the public blog&apos;s related guides section.</FieldDescription></Field>
                <Field><FieldLabel htmlFor="studio-notes">Private notes</FieldLabel><Textarea id="studio-notes" value={draft.notes} onChange={(event) => change('notes', event.target.value)} className="min-h-24" maxLength={4000} /></Field>
                </FieldGroup>
              </fieldset>
            </TabsContent>

            <TabsContent value="preview" className="min-h-[40rem] bg-muted/30 p-4 sm:p-8">
              <ArticlePreview title={draft.title} description={draft.description} topic={topicName} coverImageUrl={coverImageUrl} coverImageAlt={draft.cover_image_alt} markdown={draft.markdown} renderedHtml={rendered.html} />
            </TabsContent>

            {variants.length > 0 && (
              <TabsContent value="destinations" className="bg-muted/30 p-4 sm:p-6">
                <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
                  {variants.map((variant) => (
                    <Card key={variant.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <DestinationLogo provider={variant.provider} />
                            <div className="grid gap-0.5">
                              <CardTitle className="text-base">{providerName(variant.provider)}</CardTitle>
                              <CardDescription>Generated draft · waiting for review</CardDescription>
                            </div>
                          </div>
                          <Badge variant="outline">Draft</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-4">
                        {variant.headline && <p className="font-medium">{variant.headline}</p>}
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{variant.body}</p>
                        {variant.hashtags.length > 0 && <p className="text-sm text-muted-foreground">{variant.hashtags.map((tag) => `#${tag}`).join(' ')}</p>}
                        <Button variant="outline" onClick={() => void copyVariant(variant)}>
                          <CopyIcon data-icon="inline-start" /> Copy post
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        </Card>

        <aside className="grid content-start gap-4">
          <Card className="gap-0 py-0">
            <CardHeader className="border-b p-4"><CardTitle className="text-sm">Quality checks</CardTitle><CardDescription>{checks.filter((check) => check.passed).length} of {checks.length} checks complete</CardDescription></CardHeader>
            <CardContent className="grid gap-3 p-4">
              {checks.map((check) => (
                <div key={check.id} className="flex items-start gap-2 text-sm">
                  {check.passed ? <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /> : <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <div className="grid gap-0.5">
                    <span className={cn(!check.passed && 'text-muted-foreground')}>{check.label}</span>
                    <span className="text-xs text-muted-foreground">{check.detail}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {sources.length > 0 && (
            <Card className="gap-0 py-0">
              <CardHeader className="border-b p-4"><CardTitle className="text-sm">Research sources</CardTitle><CardDescription>{sources.length} sources saved for review</CardDescription></CardHeader>
              <CardContent className="flex flex-col gap-2 p-4">
                {(showAllSources ? sources : sources.slice(0, 8)).map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="flex items-start gap-1 text-xs font-medium text-primary hover:underline">
                    <span className="line-clamp-2">{source.title || source.publisher || source.url}</span><ExternalLinkIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  </a>
                ))}
                {sources.length > 8 && (
                  <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setShowAllSources((current) => !current)} aria-expanded={showAllSources}>
                    {showAllSources ? <ChevronUpIcon data-icon="inline-start" /> : <ChevronDownIcon data-icon="inline-start" />}
                    {showAllSources ? 'Show fewer sources' : `Show all ${sources.length} sources`}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="gap-0 py-0">
            <CardHeader className="border-b p-4"><CardTitle className="text-sm">Publishing safety</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4 text-sm text-muted-foreground">
              <p>This workspace stores a private draft. It cannot publish directly to the live website or connected social accounts.</p>
              {item.pull_request_url && <a href={item.pull_request_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Open publishing PR{item.pull_request_number ? ` #${item.pull_request_number}` : ''} <ExternalLinkIcon className="size-3.5" /></a>}
              {item.status === 'pr_open' && <Button variant="outline" size="sm" onClick={() => void refreshPublicationStatus()} disabled={workspaceBusy}><RefreshCwIcon data-icon="inline-start" /> Refresh PR status</Button>}
              {item.published_url && <a href={item.published_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Open live article <ExternalLinkIcon className="size-3.5" /></a>}
            </CardContent>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b p-4"><CardTitle className="text-sm">Article context</CardTitle></CardHeader>
            <CardContent className="grid gap-3 p-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Intent</p><p>{draft.search_intent}</p></div>
              {item.mode === 'refresh' && <div><p className="text-xs text-muted-foreground">Refreshing</p><p>{item.refresh_slug}</p></div>}
              <div><p className="text-xs text-muted-foreground">Revision</p><p>{item.revision}</p></div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={previewFullscreenOpen} onOpenChange={setPreviewFullscreenOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 grid h-dvh w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] gap-0 rounded-none p-0 ring-0 sm:max-w-none"
          overlayClassName="bg-background"
        >
          <DialogHeader className="flex-row items-center justify-between gap-4 border-b bg-background px-4 py-3 sm:px-6">
            <div className="min-w-0">
              <DialogTitle className="truncate">Article preview</DialogTitle>
              <DialogDescription className="truncate">{draft.title || 'Untitled article'} · {wordCount.toLocaleString()} words</DialogDescription>
            </div>
            <Button variant="outline" onClick={() => setPreviewFullscreenOpen(false)}>
              <Minimize2Icon data-icon="inline-start" /> Exit full screen
            </Button>
          </DialogHeader>
          <div className="overflow-y-auto bg-muted/30 px-4 py-6 sm:px-8 sm:py-10">
            <ArticlePreview title={draft.title} description={draft.description} topic={topicName} coverImageUrl={coverImageUrl} coverImageAlt={draft.cover_image_alt} markdown={draft.markdown} renderedHtml={rendered.html} className="sm:px-12 sm:py-12" />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={generationConfirmOpen} onOpenChange={setGenerationConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace the current article package?</DialogTitle>
            <DialogDescription>
              The Studio will research the topic again and replace the current title, description, article body, related links, cover, and generated destination drafts. Your brief and private notes stay intact.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTitle>Human review still required</AlertTitle>
            <AlertDescription>The result returns to Drafting. It cannot publish to the website or any social account.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerationConfirmOpen(false)}>Keep current draft</Button>
            <Button onClick={() => void generatePackage()}><SparklesIcon data-icon="inline-start" /> Replace and generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a draft publishing PR?</DialogTitle>
            <DialogDescription>
              Content Studio will commit this exact article and approved cover to a dedicated content branch, then open a draft pull request against main.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTitle>GitHub remains the final approval</AlertTitle>
            <AlertDescription>This action cannot merge, auto-merge, or write directly to production. The article becomes live only after you review and merge the PR in GitHub and deployment succeeds.</AlertDescription>
          </Alert>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishConfirmOpen(false)}>Keep editing</Button>
            <Button onClick={() => void publishDraftPullRequest()}><GitPullRequestCreateIcon data-icon="inline-start" /> Create draft PR</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
