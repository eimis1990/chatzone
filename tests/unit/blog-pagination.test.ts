import { describe, expect, it } from 'vitest'

import sitemap from '@/app/sitemap'
import {
  BLOG_PAGE_SIZE,
  getAllPosts,
  getBlogPage,
  getBlogPageCount,
  getBlogPaginationParams,
  parseBlogPageParam,
} from '@/lib/blog'
import { SITE_URL } from '@/lib/site'

describe('blog pagination', () => {
  it('uses a 12-post page size and reaches every post exactly once', () => {
    const posts = getAllPosts()
    const totalPages = getBlogPageCount(posts.length)
    const paginatedSlugs = Array.from({ length: totalPages }, (_, index) => {
      return getBlogPage(posts, index + 1)?.posts.map((post) => post.slug) ?? []
    }).flat()

    expect(BLOG_PAGE_SIZE).toBe(12)
    expect(getBlogPage(posts, 1)?.posts).toHaveLength(12)
    expect(paginatedSlugs).toEqual(posts.map((post) => post.slug))
    expect(new Set(paginatedSlugs).size).toBe(posts.length)
  })

  it('returns only archive pages 2 through the final page for static generation', () => {
    expect(getBlogPaginationParams(51)).toEqual([
      { page: '2' },
      { page: '3' },
      { page: '4' },
      { page: '5' },
    ])
    expect(getBlogPaginationParams(12)).toEqual([])
    expect(getBlogPaginationParams(0)).toEqual([])
  })

  it('rejects duplicate, malformed, and out-of-range page parameters', () => {
    const totalPages = 5

    expect(parseBlogPageParam('2', totalPages)).toBe(2)
    expect(parseBlogPageParam('5', totalPages)).toBe(5)
    for (const value of ['1', '0', '-1', '2.5', '02', 'abc', '6']) {
      expect(parseBlogPageParam(value, totalPages)).toBeNull()
    }
  })

  it('returns null instead of a soft-empty page outside the archive range', () => {
    const posts = getAllPosts()

    expect(getBlogPage(posts, 0)).toBeNull()
    expect(getBlogPage(posts, -1)).toBeNull()
    expect(getBlogPage(posts, 1.5)).toBeNull()
    expect(getBlogPage(posts, getBlogPageCount(posts.length) + 1)).toBeNull()
  })

  it('keeps archive pagination out of the sitemap while listing every article', () => {
    const urls = sitemap().map((entry) => entry.url)

    expect(urls.some((url) => url.includes('/blog/page/'))).toBe(false)
    for (const post of getAllPosts()) {
      expect(urls).toContain(`${SITE_URL}/blog/${post.slug}`)
    }
  })
})
