import { describe, expect, it } from 'vitest'
import { parseBlogFrontmatter, serializeBlogPost } from '@/lib/blog-frontmatter'
import { extractBlogFaq, renderBlogMarkdown } from '@/lib/blog-render'
import { getBlogSourceBySlug } from '@/lib/blog'

describe('blog content contract', () => {
  it('round-trips studio frontmatter without changing the body', () => {
    const raw = serializeBlogPost({
      title: 'A useful "guide"',
      description: 'Clear and practical.',
      date: '2026-08-07',
      topic: 'ecommerce-ai',
      author: 'Eimantas Kudarauskas',
      image: '/blog/a-useful-guide.webp',
      related: 'one-guide, another-guide',
    }, '## Quick answer\n\nThe answer.')
    const parsed = parseBlogFrontmatter(raw)

    expect(parsed.data.title).toBe('A useful "guide"')
    expect(parsed.data.topic).toBe('ecommerce-ai')
    expect(parsed.body.trim()).toBe('## Quick answer\n\nThe answer.')
  })

  it('cannot inject frontmatter keys through embedded newlines', () => {
    const raw = serializeBlogPost({
      title: 'Split\ntitle',
      description: 'Sneaky\nimage: /evil.webp',
      date: '2026-08-07',
      topic: 'ecommerce-ai',
      author: 'Eimantas Kudarauskas',
    }, 'Body.')
    const parsed = parseBlogFrontmatter(raw)

    expect(parsed.data.title).toBe('Split title')
    expect(parsed.data.description).toBe('Sneaky image: /evil.webp')
    expect(parsed.data.image).toBeUndefined()
  })

  it('uses the public renderer for anchored headings, tables, and FAQ extraction', () => {
    const markdown = '## Results\n\n| Item | Value |\n| --- | --- |\n| A | B |\n\n## Frequently asked questions\n\n### Does it work?\n\nYes.'
    const rendered = renderBlogMarkdown(markdown)

    expect(rendered.html).toContain('<h2 id="results">Results</h2>')
    expect(rendered.html).toContain('table-wrap--compact')
    expect(extractBlogFaq(markdown)).toEqual([{ question: 'Does it work?', answer: 'Yes.' }])
  })

  it('loads editable source for refreshes without accepting path-like input', () => {
    const source = getBlogSourceBySlug('ai-for-ecommerce')
    expect(source?.data.title).toContain('AI for e-commerce')
    expect(source?.body).toContain('quick-answer')
    expect(getBlogSourceBySlug('../ai-for-ecommerce')).toBeNull()
  })
})
