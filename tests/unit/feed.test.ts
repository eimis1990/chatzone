import { describe, it, expect, vi } from 'vitest'
import { parseFeed, searchFeed, validateFeed } from '@/lib/commerce/feed'

const XML = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0"><channel>
  <item>
    <g:id>SKU1</g:id>
    <title>Classic Clog</title>
    <g:price>39.99 EUR</g:price>
    <link>https://shop.test/classic-clog</link>
    <g:image_link>https://shop.test/img/clog.jpg</g:image_link>
    <g:availability>in stock</g:availability>
    <g:description>Comfy clogs for the beach</g:description>
  </item>
  <item>
    <g:id>SKU2</g:id>
    <title>Rain Boot</title>
    <g:price>59.00 EUR</g:price>
    <link>https://shop.test/rain-boot</link>
    <g:image_link>https://shop.test/img/boot.jpg</g:image_link>
    <g:availability>out of stock</g:availability>
  </item>
</channel></rss>`

const CSV = `id,title,price,link,image_link,availability,description
A1,Sun Hat,19.99 EUR,https://shop.test/sun-hat,https://shop.test/hat.jpg,in stock,Wide brim hat`

const JSON_FEED = '{"products":[{"name":"Foo Mug","price":"9.99 EUR","url":"https://shop.test/foo","image":"https://shop.test/f.jpg","in_stock":true}]}'

function mockFetch(body: string) {
  return vi.fn(async () => new Response(body, { status: 200 })) as unknown as typeof fetch
}

describe('parseFeed (XML / Google Shopping)', () => {
  it('extracts items, strips namespaces, maps fields, and reads availability', () => {
    const products = parseFeed(XML)
    expect(products).toHaveLength(2)
    expect(products[0]).toEqual({
      id: 'SKU1',
      title: 'Classic Clog',
      price: '39.99 EUR',
      url: 'https://shop.test/classic-clog',
      imageUrl: 'https://shop.test/img/clog.jpg',
      inStock: true,
      shortDescription: 'Comfy clogs for the beach',
    })
    expect(products[1].inStock).toBe(false) // "out of stock"
  })
})

describe('parseFeed (CSV)', () => {
  it('maps header columns to products', () => {
    const products = parseFeed(CSV)
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Sun Hat')
    expect(products[0].url).toBe('https://shop.test/sun-hat')
    expect(products[0].inStock).toBe(true)
  })
})

describe('parseFeed (JSON)', () => {
  it('finds the products array and maps it', () => {
    const products = parseFeed(JSON_FEED)
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Foo Mug')
  })

  // Shopify's PUBLIC /products.json (works without a Storefront token): price
  // and availability live per-variant, and products link by handle only.
  it('maps Shopify products.json variants and handle links', () => {
    const shopify = JSON.stringify({
      products: [
        {
          id: 5031859912749,
          title: 'The BOTANIST Islay Dry 0,7L (46%)',
          handle: 'the-botanist-islay-dry-0-7-l-46',
          body_html: '<p>Islay salos <b>džinas</b></p>',
          images: [{ src: 'https://cdn.shopify.com/x.jpg' }],
          variants: [{ id: 1, price: '37.99', available: false }],
        },
      ],
    })
    const [p] = parseFeed(shopify, 'https://gerimas.lt/products.json?limit=250')

    expect(p.price).toBe('37.99 €')
    expect(p.inStock).toBe(false)
    expect(p.url).toBe('https://gerimas.lt/products/the-botanist-islay-dry-0-7-l-46')
    expect(p.imageUrl).toBe('https://cdn.shopify.com/x.jpg')
    expect(p.shortDescription).toBe('Islay salos džinas')
  })

  it('leaves non-Shopify feeds unchanged without a base URL', () => {
    const [p] = parseFeed(JSON_FEED)
    expect(p.title).toBe('Foo Mug')
  })
})

describe('searchFeed', () => {
  it('filters by query terms', async () => {
    const out = await searchFeed('https://shop.test/feed.xml', { query: 'clog' }, { fetchImpl: mockFetch(XML) })
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Classic Clog')
  })

  it('filters by max price', async () => {
    const out = await searchFeed('https://shop.test/feed.xml', { query: '', maxPrice: 50 }, { fetchImpl: mockFetch(XML) })
    expect(out.map((p) => p.title)).toEqual(['Classic Clog']) // 39.99 ≤ 50, boot 59 excluded
  })

  it('returns [] without a feed URL', async () => {
    expect(await searchFeed('', { query: 'x' })).toEqual([])
  })

  // A single fetch of Shopify's /products.json sees at most one 250-product
  // page — the bot would deny stocking items further down the catalog.
  it('follows Shopify products.json pages until a short page', async () => {
    const shopifyPage = (n: number, count: number) =>
      JSON.stringify({
        products: Array.from({ length: count }, (_, i) => ({
          id: n * 1000 + i,
          title: `Gin p${n}-${i}`,
          handle: `gin-p${n}-${i}`,
          variants: [{ price: '10.00', available: true }],
        })),
      })
    const calls: string[] = []
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = new URL(String(url))
      calls.push(`limit=${u.searchParams.get('limit')} page=${u.searchParams.get('page') ?? '1'}`)
      const page = Number(u.searchParams.get('page') ?? '1')
      return new Response(shopifyPage(page, page < 3 ? 2 : 1))
    }) as unknown as typeof fetch

    // Page size is learned from page 1 (2 items here); page 3 is short → stop.
    const out = await searchFeed(
      'https://gerimas.test/products.json?limit=2',
      { query: 'gin', limit: 24 },
      { fetchImpl },
    )
    expect(calls).toEqual(['limit=2 page=1', 'limit=2 page=2', 'limit=2 page=3'])
    expect(out).toHaveLength(5)
  })

  it('forces limit=250 on a bare products.json URL and keeps other feeds single-fetch', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      expect(String(url)).toContain('limit=250')
      return new Response(JSON.stringify({ products: [] }))
    }) as unknown as typeof fetch
    await searchFeed('https://gerimas.test/products.json', { query: 'x' }, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)

    const single = vi.fn(async () => new Response(XML)) as unknown as typeof fetch
    await searchFeed('https://shop.test/feed.xml', { query: '' }, { fetchImpl: single })
    expect(single).toHaveBeenCalledTimes(1)
  })
})

describe('validateFeed', () => {
  it('reports ok + parsed count', async () => {
    const r = await validateFeed('https://shop.test/feed.xml', { fetchImpl: mockFetch(XML) })
    expect(r).toEqual({ ok: true, total: 2 })
  })

  it('fails on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 })) as unknown as typeof fetch
    const r = await validateFeed('https://shop.test/feed.xml', { fetchImpl })
    expect(r).toEqual({ ok: false, total: 0 })
  })
})
