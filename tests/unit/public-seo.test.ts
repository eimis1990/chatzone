import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import { getAllPosts } from '@/lib/blog'
import { SITE_URL, LEGAL_UPDATED } from '@/lib/site'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

describe('sitemap', () => {
  const entries = sitemap()

  it('has unique, absolute URLs on the production origin', () => {
    const urls = entries.map((e) => e.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const url of urls) expect(url.startsWith(`${SITE_URL}/`)).toBe(true)
  })

  it('covers home, blog, every post, and legal pages', () => {
    const urls = new Set(entries.map((e) => e.url))
    const posts = getAllPosts()
    expect(urls.has(`${SITE_URL}/`)).toBe(true)
    expect(urls.has(`${SITE_URL}/blog`)).toBe(true)
    for (const p of posts) expect(urls.has(`${SITE_URL}/blog/${p.slug}`)).toBe(true)
    expect(urls.has(`${SITE_URL}/privacy`)).toBe(true)
    expect(urls.has(`${SITE_URL}/terms`)).toBe(true)
  })

  it('uses real modification dates, never build time', () => {
    const byUrl = new Map(entries.map((e) => [e.url, e]))
    // Listings have no reliable per-edit source → no lastModified at all.
    expect(byUrl.get(`${SITE_URL}/`)?.lastModified).toBeUndefined()
    expect(byUrl.get(`${SITE_URL}/blog`)?.lastModified).toBeUndefined()
    // Legal pages pin the recorded last substantive edit.
    expect(byUrl.get(`${SITE_URL}/privacy`)?.lastModified).toEqual(new Date(LEGAL_UPDATED.privacy))
    expect(byUrl.get(`${SITE_URL}/terms`)?.lastModified).toEqual(new Date(LEGAL_UPDATED.terms))
    // Articles use updated ?? date.
    for (const p of getAllPosts()) {
      expect(byUrl.get(`${SITE_URL}/blog/${p.slug}`)?.lastModified).toEqual(
        new Date(p.updated ?? p.date),
      )
    }
  })

  it('is deterministic across calls (no request-time Date.now)', () => {
    expect(sitemap()).toEqual(entries)
  })
})

describe('post dates', () => {
  it('every post has a valid ISO date, and updated (when present) is a later-or-equal ISO date', () => {
    const posts = getAllPosts()
    // Real content exercises both branches of `updated ?? date`.
    expect(posts.some((p) => p.updated)).toBe(true)
    expect(posts.some((p) => !p.updated)).toBe(true)
    for (const p of posts) {
      expect(p.date, p.slug).toMatch(ISO_DAY)
      if (p.updated) {
        expect(p.updated, p.slug).toMatch(ISO_DAY)
        expect(p.updated >= p.date, `${p.slug}: updated ${p.updated} < date ${p.date}`).toBe(true)
      }
    }
  })
})

describe('related posts', () => {
  it('every explicit related slug resolves to a real post and never self-links', () => {
    const posts = getAllPosts()
    const slugs = new Set(posts.map((p) => p.slug))
    for (const p of posts) {
      for (const rel of p.related ?? []) {
        expect(slugs.has(rel), `${p.slug} → related "${rel}"`).toBe(true)
        expect(rel, p.slug).not.toBe(p.slug)
      }
    }
  })
})
