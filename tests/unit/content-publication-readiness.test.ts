import { describe, expect, it } from 'vitest'
import { assertContentPublicationReady } from '@/lib/content-studio/publish/readiness'
import type { ContentItem, ContentSource } from '@/lib/content-studio/types'

const quickAnswer = 'A useful AI shopping assistant should answer from current store data, show verifiable product details, and admit when information is missing. Start with one defined customer task, connect trustworthy catalogue and policy sources, test difficult questions, and require human review before treating generated recommendations as dependable operational guidance for a live shop.'
const sections = Array.from({ length: 5 }, (_, index) => `## How does step ${index + 1} work?\n\n${'Practical implementation guidance. '.repeat(45)}`).join('\n\n')
const markdown = `Opening.\n\n<blockquote class="quick-answer">${quickAnswer}</blockquote>\n\n${sections}\n\nSee [one](/blog/guide-one) and [two](/blog/guide-two). [A](https://a.example/research), [B](https://b.example/research), [C](https://c.example/research).\n\n## Frequently asked questions\n\n${Array.from({ length: 6 }, (_, index) => `### Question ${index + 1}?\n\nAnswer.`).join('\n\n')}`

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
  search_intent: 'Learn how it works',
  reader_job: 'Decide whether to introduce it',
  refresh_slug: null,
  language: 'en',
  notes: '',
  markdown,
  related_slugs: ['guide-one', 'guide-two'],
  cover_image_path: 'owner/item/cover.webp',
  cover_image_alt: 'An online retailer reviewing an AI shopping assistant workflow',
  cover_image_prompt: 'A sufficiently detailed text-free editorial image direction for the article cover.',
  pull_request_url: null,
  pull_request_number: null,
  publication_branch: null,
  publication_commit_sha: null,
  publication_base_sha: null,
  published_url: null,
  revision: 5,
  created_at: '2026-08-07T12:00:00.000Z',
  updated_at: '2026-08-07T13:00:00.000Z',
  published_at: null,
} satisfies ContentItem

const sources = ['a', 'b', 'c'].map((name) => ({
  id: name,
  content_item_id: item.id,
  url: `https://${name}.example/research`,
  title: name,
  publisher: `${name}.example`,
  excerpt: '',
  source_kind: 'web' as const,
  fetched_at: null,
  created_at: item.created_at,
})) satisfies ContentSource[]

describe('Content Studio publication readiness', () => {
  it('returns the current deterministic checks for a ready, linked, covered article', () => {
    const checks = assertContentPublicationReady(
      item,
      sources,
      new Set(['guide-one', 'guide-two']),
      new Set(['ecommerce-ai']),
    )
    expect(checks.filter((check) => check.severity === 'required').every((check) => check.passed)).toBe(true)
  })

  it('rejects stale or nonexistent internal links before GitHub is called', () => {
    expect(() => assertContentPublicationReady(
      { ...item, related_slugs: ['missing-guide'] },
      sources,
      new Set(['guide-one', 'guide-two']),
      new Set(['ecommerce-ai']),
    )).toThrow(/missing-guide/)
  })

  it('requires explicit Ready status and an approved cover', () => {
    expect(() => assertContentPublicationReady({ ...item, status: 'review' }, sources, new Set(), new Set(['ecommerce-ai']))).toThrow(/marked Ready/)
    expect(() => assertContentPublicationReady({ ...item, cover_image_path: null }, sources, new Set(), new Set(['ecommerce-ai']))).toThrow(/cover image/)
  })
})
