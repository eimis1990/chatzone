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
