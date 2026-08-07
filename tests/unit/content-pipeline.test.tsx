import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ContentPipeline } from '@/components/owner/content/ContentPipeline'
import type { ContentActiveRun, ContentItem, ContentStatus } from '@/lib/content-studio/types'

const realtime = vi.hoisted(() => ({
  callbacks: {} as Record<string, (payload: { eventType: string; new: unknown; old: unknown }) => void>,
  router: { refresh: vi.fn() },
  removeChannel: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => realtime.router }))
vi.mock('@/lib/supabase/browser', () => ({
  createBrowserClient: () => {
    const channel = {
      on: vi.fn((_event: string, filter: { table: string }, callback: (payload: { eventType: string; new: unknown; old: unknown }) => void) => {
        realtime.callbacks[filter.table] = callback
        return channel
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        callback('SUBSCRIBED')
        return channel
      }),
    }
    return { channel: () => channel, removeChannel: realtime.removeChannel }
  },
}))

function item(id: string, title: string, status: ContentStatus): ContentItem {
  return {
    id,
    created_by: '10000000-0000-4000-8000-000000000001',
    mode: 'new',
    status,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    description: '',
    topic: 'ecommerce-ai',
    target_query: `query for ${title.toLowerCase()}`,
    search_intent: 'Learn',
    reader_job: 'Make a decision',
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
    created_at: '2026-08-07T10:00:00.000Z',
    updated_at: '2026-08-07T10:00:00.000Z',
    published_at: status === 'published' ? '2026-08-07T10:00:00.000Z' : null,
  }
}

describe('ContentPipeline', () => {
  it('separates active work from published articles and searches real content', () => {
    render(<ContentPipeline proactiveSuggestions={false} targets={[]} initialItems={[
      item('10000000-0000-4000-8000-000000000010', 'Shopping assistant guide', 'drafting'),
      item('10000000-0000-4000-8000-000000000011', 'Published support guide', 'published'),
    ]} />)

    expect(screen.getByText('Shopping assistant guide')).toBeInTheDocument()
    expect(screen.queryByText('Published support guide')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Published/ }))
    expect(screen.getByText('Published support guide')).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Search articles' }), { target: { value: 'missing' } })
    expect(screen.getByText('No articles match this search')).toBeInTheDocument()
  })

  it('shows active background work and moves a card when Realtime updates its status', async () => {
    const draft = item('10000000-0000-4000-8000-000000000012', 'Live article', 'drafting')
    const activeRun: ContentActiveRun = {
      id: '10000000-0000-4000-8000-000000000099',
      content_item_id: draft.id,
      operation: 'draft',
      status: 'in_progress',
      created_at: '2026-08-07T10:01:00.000Z',
      started_at: '2026-08-07T10:01:00.000Z',
    }
    render(<ContentPipeline proactiveSuggestions={false} targets={[]} initialItems={[draft]} initialActiveRuns={[activeRun]} />)

    expect(await screen.findByText('Live updates')).toBeInTheDocument()
    expect(screen.getByText('Researching & writing')).toBeInTheDocument()
    const writing = screen.getByRole('heading', { name: 'Writing' }).closest('section')
    expect(writing).not.toBeNull()
    expect(within(writing!).getByText('Live article')).toBeInTheDocument()

    act(() => {
      realtime.callbacks.content_items({
        eventType: 'UPDATE',
        old: draft,
        new: { ...draft, status: 'ready', updated_at: '2026-08-07T10:02:00.000Z' },
      })
    })

    await waitFor(() => {
      const review = screen.getByRole('heading', { name: 'Review & publish' }).closest('section')
      expect(review).not.toBeNull()
      expect(within(review!).getByText('Live article')).toBeInTheDocument()
    })
  })
})
