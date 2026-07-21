import { describe, it, expect } from 'vitest'
import { getAllPosts, getRelatedPosts } from '@/lib/blog'

describe('related guides', () => {
  const posts = getAllPosts()

  it('every published post has explicit curated related slugs', () => {
    for (const p of posts) {
      expect(p.related, `${p.slug} has no related: frontmatter`).toBeTruthy()
      expect(p.related!.length, p.slug).toBeGreaterThanOrEqual(2)
    }
  })

  it('related slugs resolve, are unique, and never self-reference', () => {
    const slugs = new Set(posts.map((p) => p.slug))
    for (const p of posts) {
      const rels = p.related ?? []
      expect(new Set(rels).size, p.slug).toBe(rels.length)
      for (const r of rels) {
        expect(slugs.has(r), `${p.slug} → "${r}"`).toBe(true)
        expect(r, p.slug).not.toBe(p.slug)
      }
    }
  })

  it('the fallback fills from the same topic, never global recency', () => {
    // Every current post has curated related links, so exercise the fallback
    // directly: ask for more slots than any post curates.
    for (const p of posts.slice(0, 5)) {
      const rel = getRelatedPosts(p.slug, 6)
      const curated = new Set(p.related ?? [])
      for (const r of rel) {
        if (!curated.has(r.slug)) {
          expect(r.topic, `${p.slug} fallback pulled cross-topic ${r.slug}`).toBe(p.topic)
        }
      }
    }
  })
})
