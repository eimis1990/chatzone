import { describe, expect, it, vi } from 'vitest'
import { getPublicationPaths, publicationDateFromExisting, serializePublicationMarkdown } from '@/lib/content-studio/publish/files'
import { getGitHubPullRequestStatus, publishContentToGitHub } from '@/lib/content-studio/publish/github'
import type { GitHubContentConfig, PublishContentInput } from '@/lib/content-studio/publish/types'
import type { ContentItem } from '@/lib/content-studio/types'

const item = {
  id: '10000000-0000-4000-8000-000000000020',
  created_by: '10000000-0000-4000-8000-000000000001',
  mode: 'new',
  status: 'ready',
  title: 'How AI shopping assistants help online stores',
  slug: 'ai-shopping-assistant-guide',
  description: 'A practical guide to AI shopping assistants, their data requirements, limitations, and safe rollout for online retailers.',
  topic: 'ecommerce-ai',
  target_query: 'AI shopping assistant',
  search_intent: 'Learn how an AI shopping assistant works',
  reader_job: 'Decide whether and how to introduce one safely',
  refresh_slug: null,
  language: 'en',
  notes: '',
  markdown: '<blockquote class="quick-answer">A sufficiently complete direct answer for the reader.</blockquote>\n\n## Guide\n\nArticle.',
  related_slugs: ['ai-for-ecommerce', 'semantic-search-ecommerce'],
  cover_image_path: '10000000-0000-4000-8000-000000000001/10000000-0000-4000-8000-000000000020/cover.webp',
  cover_image_alt: 'An online retailer reviewing an AI-assisted product discovery workflow',
  cover_image_prompt: 'A detailed text-free editorial image prompt for an online retailer.',
  pull_request_url: null,
  pull_request_number: null,
  publication_branch: null,
  publication_commit_sha: null,
  publication_base_sha: null,
  published_url: null,
  revision: 4,
  created_at: '2026-08-07T12:00:00.000Z',
  updated_at: '2026-08-07T12:30:00.000Z',
  published_at: null,
} satisfies ContentItem

const config: GitHubContentConfig = {
  token: 'github_pat_secret-value',
  repository: 'eimis1990/chatzone',
  baseBranch: 'main',
}

const input: PublishContentInput = {
  item,
  sources: [{
    id: 'source-1',
    content_item_id: item.id,
    url: 'https://example.com/research',
    title: 'Research',
    publisher: 'Example',
    excerpt: '',
    source_kind: 'web',
    fetched_at: '2026-08-07T12:00:00.000Z',
    created_at: '2026-08-07T12:00:00.000Z',
  }],
  checks: [{ id: 'citations', label: 'Citations', detail: 'Ready', passed: true, severity: 'required' }],
  cover: { bytes: new Uint8Array([1, 2, 3]), mediaType: 'image/webp' },
  now: new Date('2026-08-08T10:00:00.000Z'),
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Content Studio GitHub publisher', () => {
  it('derives safe deterministic paths and preserves refresh publication dates', () => {
    expect(getPublicationPaths(item)).toEqual({
      branch: 'content/2026-08-07-ai-shopping-assistant-guide-10000000',
      markdownPath: 'content/blog/ai-shopping-assistant-guide.md',
      imagePath: 'public/blog/ai-shopping-assistant-guide.webp',
      publicImagePath: '/blog/ai-shopping-assistant-guide.webp',
    })
    expect(() => getPublicationPaths({ ...item, slug: '../main' })).toThrow(/slug is not safe/)
    const existing = '---\ntitle: "Old"\ndate: 2025-03-04\n---\nBody'
    expect(publicationDateFromExisting(existing)).toBe('2025-03-04')
    const refresh = { ...item, mode: 'refresh', refresh_slug: item.slug } satisfies ContentItem
    expect(serializePublicationMarkdown(refresh, '2025-03-04', '2026-08-08')).toContain('updated: 2026-08-08')
  })

  it('creates blobs, one tree and commit, a branch, and a draft PR without writing main', async () => {
    const calls: Array<{ url: string; method: string; body: unknown }> = []
    let blob = 0
    const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const href = String(url)
      const method = init?.method ?? 'GET'
      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({ url: href, method, body })
      if (href.includes('/git/ref/heads/main')) return json({ object: { sha: 'base-sha' } })
      if (href.includes('/contents/')) return json({ message: 'Not Found' }, 404)
      if (href.includes('/git/ref/heads/content%2F')) return json({ message: 'Not Found' }, 404)
      if (href.includes('/pulls?')) return json([])
      if (href.endsWith('/git/commits/base-sha')) return json({ tree: { sha: 'base-tree' } })
      if (href.endsWith('/git/blobs')) return json({ sha: `blob-${++blob}` }, 201)
      if (href.endsWith('/git/trees')) return json({ sha: 'new-tree' }, 201)
      if (href.endsWith('/git/commits')) return json({ sha: 'new-commit' }, 201)
      if (href.endsWith('/git/refs')) return json({ ref: 'created' }, 201)
      if (href.endsWith('/pulls')) return json({ number: 42, html_url: 'https://github.com/eimis1990/chatzone/pull/42', head: { sha: 'new-commit' } }, 201)
      throw new Error(`Unhandled ${method} ${href}`)
    }) as unknown as typeof fetch

    const result = await publishContentToGitHub(input, config, fetchMock)
    expect(result).toMatchObject({ pullRequestNumber: 42, commitSha: 'new-commit', reused: false })
    const treeCall = calls.find((call) => call.url.endsWith('/git/trees'))!
    expect(treeCall.body).toMatchObject({
      base_tree: 'base-tree',
      tree: [
        { path: 'content/blog/ai-shopping-assistant-guide.md', type: 'blob' },
        { path: 'public/blog/ai-shopping-assistant-guide.webp', type: 'blob' },
      ],
    })
    const commitCall = calls.find((call) => call.url.endsWith('/git/commits') && call.method === 'POST')!
    expect(commitCall.body).toMatchObject({ parents: ['base-sha'], tree: 'new-tree' })
    expect(calls.some((call) => call.method === 'PATCH' && call.url.includes('/heads/main'))).toBe(false)
    expect(calls.find((call) => call.url.endsWith('/pulls'))?.body).toMatchObject({ draft: true, base: 'main' })
  })

  it('reuses an already-open PR without creating repository objects', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url)
      if (href.includes('/git/ref/heads/main')) return json({ object: { sha: 'base-sha' } })
      if (href.includes('/contents/')) return json({ message: 'Not Found' }, 404)
      if (href.includes('/git/ref/heads/content%2F')) return json({ object: { sha: 'existing-head' } })
      if (href.includes('/pulls?')) return json([{ number: 42, html_url: 'https://github.com/eimis1990/chatzone/pull/42', state: 'open', draft: true, merged_at: null, head: { sha: 'existing-head' } }])
      throw new Error(`Unexpected mutation: ${href}`)
    }) as unknown as typeof fetch

    await expect(publishContentToGitHub(input, config, fetchMock)).resolves.toMatchObject({ reused: true, commitSha: 'existing-head' })
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('stops on a slug conflict before creating any Git objects', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url)
      if (href.includes('/git/ref/heads/main')) return json({ object: { sha: 'base-sha' } })
      if (href.includes('/contents/')) return json({ content: 'existing', encoding: 'base64' })
      throw new Error(`Unexpected request: ${href}`)
    }) as unknown as typeof fetch
    await expect(publishContentToGitHub(input, config, fetchMock)).rejects.toThrow(/already exists on main/)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('redacts credentials from GitHub error messages', async () => {
    const fetchMock = vi.fn(async () => json({ message: 'Bad authorization Bearer github_pat_secret-value' }, 401)) as unknown as typeof fetch
    let error: Error | null = null
    try {
      await publishContentToGitHub(input, config, fetchMock)
    } catch (caught) {
      error = caught as Error
    }
    if (!error) throw new Error('Expected GitHub publishing to fail')
    expect(error.message).toContain('[redacted]')
    expect(error.message).not.toContain('github_pat_secret-value')
  })

  it('maps the stored PR number to a reconciliation-safe status', async () => {
    const fetchMock = vi.fn(async () => json({
      number: 42,
      html_url: 'https://github.com/eimis1990/chatzone/pull/42',
      state: 'closed',
      draft: false,
      merged_at: '2026-08-08T12:00:00.000Z',
      head: { sha: 'c'.repeat(40) },
    })) as unknown as typeof fetch

    await expect(getGitHubPullRequestStatus(42, config, fetchMock)).resolves.toEqual({
      number: 42,
      url: 'https://github.com/eimis1990/chatzone/pull/42',
      state: 'closed',
      draft: false,
      merged: true,
      mergedAt: '2026-08-08T12:00:00.000Z',
      headSha: 'c'.repeat(40),
    })
  })
})
