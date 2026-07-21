import { existsSync } from 'fs'
import { join } from 'path'
import { describe, it, expect } from 'vitest'
import { getAllPosts } from '@/lib/blog'
import { FAQ } from '@/components/landing/faq-data'

// JSON-LD must only state what is visible on the page (design §3.8 / task 4.6).
// The homepage FAQ schema and accordion share the FAQ constant, so their parity
// is structural; these tests guard the data feeding the markup.

describe('homepage FAQ data', () => {
  it('has non-empty questions and answers', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(3)
    for (const [q, a] of FAQ) {
      expect(q.trim().length).toBeGreaterThan(0)
      expect(a.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('article structured data inputs', () => {
  const posts = getAllPosts()

  it('FAQ schema entries mirror visible article content', () => {
    for (const p of posts) {
      // Schema questions are plain text; the body renders them with inline
      // markup (e.g. <code>), so compare against the tag-stripped text.
      const visibleText = p.html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      for (const f of p.faq) {
        expect(f.question.trim().length, p.slug).toBeGreaterThan(0)
        expect(f.answer.trim().length, p.slug).toBeGreaterThan(0)
        // The question must appear in the rendered article body (schema may not
        // invent Q&A the reader cannot see).
        expect(visibleText.includes(f.question), `${p.slug}: "${f.question}" not visible`).toBe(true)
      }
    }
  })

  it('JSON-LD image paths point at real files under /public', () => {
    for (const p of posts) {
      if (!p.image) continue
      expect(existsSync(join(process.cwd(), 'public', p.image)), `${p.slug}: ${p.image}`).toBe(true)
    }
  })
})
