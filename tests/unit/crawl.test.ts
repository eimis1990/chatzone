import { describe, it, expect, vi } from 'vitest'
import { discoverPages } from '@/lib/ingestion/crawl'

function res(body: string, { ok = true, contentType = 'text/html' } = {}) {
  return {
    ok,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  } as unknown as Response
}

describe('discoverPages', () => {
  it('uses the sitemap when present (same-origin pages, assets filtered)', async () => {
    const sitemap = `<urlset>
      <url><loc>https://acme.com/</loc></url>
      <url><loc>https://acme.com/returns</loc></url>
      <url><loc>https://acme.com/shipping</loc></url>
      <url><loc>https://acme.com/logo.png</loc></url>
      <url><loc>https://other.com/x</loc></url>
    </urlset>`
    const fetchImpl = vi.fn(async (url: string) =>
      url.endsWith('/sitemap.xml') ? res(sitemap, { contentType: 'application/xml' }) : res('<html></html>'),
    ) as unknown as typeof fetch

    const pages = await discoverPages('https://acme.com', 25, fetchImpl)
    expect(pages).toContain('https://acme.com/returns')
    expect(pages).toContain('https://acme.com/shipping')
    expect(pages.some((u) => u.includes('logo.png'))).toBe(false) // asset filtered
    expect(pages.some((u) => u.includes('other.com'))).toBe(false) // cross-origin filtered
  })

  it('expands a sitemap index one level', async () => {
    const index = `<sitemapindex><sitemap><loc>https://acme.com/sm-1.xml</loc></sitemap></sitemapindex>`
    const child = `<urlset><url><loc>https://acme.com/deep/page</loc></url></urlset>`
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return res(index, { contentType: 'application/xml' })
      if (url.endsWith('/sm-1.xml')) return res(child, { contentType: 'application/xml' })
      return res('<html></html>')
    }) as unknown as typeof fetch

    const pages = await discoverPages('https://acme.com', 25, fetchImpl)
    expect(pages).toContain('https://acme.com/deep/page')
  })

  it('falls back to following same-origin links when there is no sitemap', async () => {
    const html = `<a href="/about">About</a> <a href="/pricing">Pricing</a>
      <a href="https://twitter.com/acme">x</a> <a href="/style.css">css</a>`
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/sitemap.xml')) return res('', { ok: false })
      return res(html)
    }) as unknown as typeof fetch

    const pages = await discoverPages('https://acme.com', 25, fetchImpl)
    expect(pages).toContain('https://acme.com/') // base included
    expect(pages).toContain('https://acme.com/about')
    expect(pages).toContain('https://acme.com/pricing')
    expect(pages.some((u) => u.includes('twitter.com'))).toBe(false)
    expect(pages.some((u) => u.includes('.css'))).toBe(false)
  })

  it('caps at maxPages', async () => {
    const locs = Array.from({ length: 50 }, (_, i) => `<url><loc>https://acme.com/p${i}</loc></url>`).join('')
    const fetchImpl = vi.fn(async () => res(`<urlset>${locs}</urlset>`, { contentType: 'application/xml' })) as unknown as typeof fetch
    const pages = await discoverPages('https://acme.com', 10, fetchImpl)
    expect(pages).toHaveLength(10)
  })

  it('dedupes and ignores invalid input', async () => {
    expect(await discoverPages('not a url', 10, (async () => res('')) as unknown as typeof fetch)).toEqual([])
  })
})
