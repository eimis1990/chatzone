import { describe, expect, it } from 'vitest'
import { buildArticleDraftPrompt, buildArticleResearchPrompt } from '@/lib/content-studio/generation'
import type { ContentItem } from '@/lib/content-studio/types'

const item = {
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
  notes: 'Use primary sources',
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

describe('Content Studio generation prompts', () => {
  it('requires live primary-source research without drafting prematurely', () => {
    const prompt = buildArticleResearchPrompt(item)
    expect(prompt).toContain('Use live web search')
    expect(prompt).toContain('Prefer primary sources')
    expect(prompt).toContain('Do not draft the article yet')
  })

  it('requests only selected social destinations and preserves the approval boundary', () => {
    const prompt = buildArticleDraftPrompt(
      item,
      'Research notes with evidence.',
      ['https://example.com/source'],
      ['linkedin', 'instagram'],
    )
    expect(prompt).toContain('linkedin, instagram')
    expect(prompt).toContain('Return exactly one draft per requested provider')
    expect(prompt).toContain('Human review is mandatory')
    expect(prompt).toContain('without frontmatter and without an H1')
  })
})
