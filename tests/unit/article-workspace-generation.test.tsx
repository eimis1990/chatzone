import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArticleWorkspace } from '@/components/owner/content/ArticleWorkspace'
import type { ContentItem } from '@/lib/content-studio/types'

const generateContentPackage = vi.fn()
const generateContentCover = vi.fn()
const publishContentToDraftPullRequest = vi.fn()
const reconcileContentPublication = vi.fn()
vi.mock('@/app/(owner)/owner/content/actions', () => ({
  archiveContentItem: vi.fn(),
  generateContentCover: (...args: unknown[]) => generateContentCover(...args),
  generateContentPackage: (...args: unknown[]) => generateContentPackage(...args),
  publishContentToDraftPullRequest: (...args: unknown[]) => publishContentToDraftPullRequest(...args),
  reconcileContentPublication: (...args: unknown[]) => reconcileContentPublication(...args),
  updateContentDraft: vi.fn(),
  updateContentStatus: vi.fn(),
}))

const initialItem = {
  id: '10000000-0000-4000-8000-000000000020',
  created_by: '10000000-0000-4000-8000-000000000001',
  mode: 'new',
  status: 'idea',
  title: 'AI shopping assistant guide',
  slug: 'ai-shopping-assistant-guide',
  description: '',
  topic: 'ecommerce-ai',
  target_query: 'AI shopping assistant',
  search_intent: 'Learn how it works',
  reader_job: 'Decide how to introduce it safely',
  refresh_slug: null,
  language: 'en',
  notes: '',
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
  created_at: '2026-08-07T12:00:00.000Z',
  updated_at: '2026-08-07T12:00:00.000Z',
  published_at: null,
} satisfies ContentItem

describe('ArticleWorkspace generation', () => {
  it('opens the article preview in a full-screen dialog', async () => {
    render(
      <ArticleWorkspace
        initialItem={{ ...initialItem, markdown: 'A readable preview body.' }}
        initialSources={[]}
        initialVariants={[]}
        initialCoverImageUrl={null}
        publicationConfigured
        topics={[{ slug: 'ecommerce-ai', name: 'AI for e-commerce' }]}
      />,
    )

    expect(screen.getByRole('textbox', { name: 'Article body' })).toHaveClass(
      'h-[calc(100svh-10rem)]',
      'field-sizing-fixed',
      'overflow-y-auto',
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Preview' }))
    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Article preview' })).toBeInTheDocument()
    expect(within(dialog).getByText('A readable preview body.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Exit full screen' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('turns a brief into a reviewable article and destination draft', async () => {
    const generatedItem: ContentItem = {
      ...initialItem,
      status: 'drafting',
      title: 'How AI shopping assistants help online stores',
      description: 'A complete description that explains what the article helps an online-store operator understand before adopting an AI shopping assistant.',
      markdown: 'Opening context.\n\n## What changes?\n\nGenerated article body.',
      revision: 2,
      cover_image_alt: 'An online-store operator reviewing an AI recommendation workflow',
      cover_image_prompt: 'A text-free editorial cover illustration of an online-store operator reviewing recommendations.',
    }
    generateContentPackage.mockResolvedValueOnce({
      item: generatedItem,
      sources: [{
        id: 'source-1',
        content_item_id: initialItem.id,
        url: 'https://example.com/research',
        title: 'Primary research source',
        publisher: 'example.com',
        excerpt: '',
        source_kind: 'web',
        fetched_at: '2026-08-07T12:30:00.000Z',
        created_at: '2026-08-07T12:30:00.000Z',
      }],
      variants: [{
        id: 'variant-1',
        content_item_id: initialItem.id,
        provider: 'linkedin',
        slot_key: 'default',
        content_type: 'social_post',
        status: 'draft',
        headline: 'A practical AI shopping guide',
        body: 'A generated LinkedIn draft.',
        hashtags: ['ecommerce', 'ai'],
        image_prompt: 'A text-free social image.',
        created_at: '2026-08-07T12:30:00.000Z',
        updated_at: '2026-08-07T12:30:00.000Z',
      }],
      checks: [{ id: 'title', label: 'Title', detail: 'Ready', passed: true, severity: 'required' }],
      coverImageUrl: null,
      imageWarning: null,
    })
    generateContentCover.mockResolvedValueOnce({
      coverImagePath: `${initialItem.created_by}/${initialItem.id}/cover.webp`,
      coverImageUrl: 'https://example.com/signed-cover.webp',
      revision: 3,
    })

    render(
      <ArticleWorkspace
        initialItem={initialItem}
        initialSources={[]}
        initialVariants={[]}
        initialCoverImageUrl={null}
        publicationConfigured
        topics={[{ slug: 'ecommerce-ai', name: 'AI for e-commerce' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate article package' }))

    await waitFor(() => expect(generateContentPackage).toHaveBeenCalledWith(initialItem.id, 1))
    await waitFor(() => expect(generateContentCover).toHaveBeenCalledWith(initialItem.id, 2))
    expect(await screen.findByRole('tab', { name: /Destinations/ })).toBeInTheDocument()
    expect(screen.getByText('Primary research source')).toBeInTheDocument()
    expect(screen.getByText('How AI shopping assistants help online stores')).toBeInTheDocument()
  })

  it('confirms and creates a review-only draft publishing PR from Ready', async () => {
    const readyItem = { ...initialItem, status: 'ready', revision: 5 } satisfies ContentItem
    const prItem = {
      ...readyItem,
      status: 'pr_open',
      revision: 6,
      pull_request_url: 'https://github.com/eimis1990/chatzone/pull/42',
      pull_request_number: 42,
      publication_branch: 'content/2026-08-07-ai-shopping-assistant-guide-10000000',
      publication_commit_sha: 'a'.repeat(40),
      publication_base_sha: 'b'.repeat(40),
    } satisfies ContentItem
    publishContentToDraftPullRequest.mockResolvedValueOnce({ item: prItem, reused: false })
    reconcileContentPublication.mockResolvedValue({ item: prItem, message: 'Draft PR #42 is still open and waiting for GitHub review' })

    render(
      <ArticleWorkspace
        initialItem={readyItem}
        initialSources={[]}
        initialVariants={[]}
        initialCoverImageUrl={null}
        publicationConfigured
        topics={[{ slug: 'ecommerce-ai', name: 'AI for e-commerce' }]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Create draft PR' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('GitHub remains the final approval')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create draft PR' }))

    await waitFor(() => expect(publishContentToDraftPullRequest).toHaveBeenCalledWith(initialItem.id, 5))
    expect(await screen.findByRole('link', { name: /Open publishing PR #42/ })).toHaveAttribute('href', prItem.pull_request_url)
  })
})
