import { describe, it, expect, vi } from 'vitest'
import {
  searchWooProducts,
  listWooProductsByUrl,
  fetchWooProductDetails,
  normalizeWooProduct,
  formatWooPrice,
  storeOrigin,
} from '@/lib/commerce/woocommerce'

const sample = {
  id: 42,
  name: 'Hydrating Eye Mask',
  permalink: 'https://shop.test/produktas/eye-mask/',
  is_in_stock: true,
  short_description: '<p>Refreshing <b>hyaluronic</b> mask.</p>',
  images: [{ src: 'https://shop.test/img/eye-mask.jpg' }],
  prices: { price: '399', currency_minor_unit: 2, currency_symbol: '€', currency_prefix: '', currency_suffix: ' €' },
}

describe('formatWooPrice', () => {
  it('formats minor-unit price with suffix', () => {
    expect(formatWooPrice(sample.prices)).toBe('3.99 €')
  })
  it('falls back to symbol when no prefix/suffix', () => {
    expect(formatWooPrice({ price: '1000', currency_minor_unit: 2, currency_symbol: '$' })).toBe('10.00 $')
  })
})

describe('normalizeWooProduct', () => {
  it('maps Store API fields and strips HTML', () => {
    const p = normalizeWooProduct(sample)
    expect(p).toEqual({
      id: '42',
      title: 'Hydrating Eye Mask',
      price: '3.99 €',
      url: 'https://shop.test/produktas/eye-mask/',
      imageUrl: 'https://shop.test/img/eye-mask.jpg',
      inStock: true,
      shortDescription: 'Refreshing hyaluronic mask.',
    })
  })
})

describe('storeOrigin', () => {
  it('reduces a deep URL to its origin', () => {
    expect(storeOrigin('https://shop.test/produkto-kategorija/vyrams/?x=1')).toBe('https://shop.test')
  })
})

describe('searchWooProducts', () => {
  it('builds the Store API query (search + price→minor units) and maps results', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([sample]), { status: 200 }))
    const out = await searchWooProducts(
      'https://shop.test',
      { query: 'eye mask', maxPrice: 30, limit: 6 },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Hydrating Eye Mask')
    const calledUrl = String((fetchImpl.mock.calls[0] as unknown as [string])[0])
    expect(calledUrl).toContain('/wp-json/wc/store/v1/products?')
    expect(calledUrl).toContain('search=eye+mask')
    expect(calledUrl).toContain('max_price=3000')
    expect(calledUrl).toContain('per_page=6')
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 }))
    await expect(
      searchWooProducts('https://shop.test', { query: 'x' }, { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow()
  })
})

describe('fetchWooProductDetails', () => {
  const detailed = {
    ...sample,
    description: '<p>Full <b>description</b> with sizing and care instructions.</p>',
    attributes: [
      { name: 'Spalva', terms: [{ name: 'mėlyna' }, { name: 'žalia' }] },
      { name: 'Dydis', terms: [{ name: '250g' }] },
      { name: 'Empty', terms: [] },
    ],
  }

  it('fetches by include ids and maps full description + attribute lines', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([detailed]), { status: 200 }))
    const out = await fetchWooProductDetails('https://shop.test', ['42'], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(String((fetchImpl.mock.calls[0] as unknown as [string])[0])).toContain('include=42')
    expect(out).toEqual([
      {
        id: '42',
        title: 'Hydrating Eye Mask',
        description: 'Full description with sizing and care instructions.',
        attributes: ['Spalva: mėlyna, žalia', 'Dydis: 250g'],
      },
    ])
  })

  it('falls back to short_description and omits empty attributes', async () => {
    const noDesc = { ...sample, attributes: [] }
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([noDesc]), { status: 200 }))
    const out = await fetchWooProductDetails('https://shop.test', ['42'], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out[0].description).toBe('Refreshing hyaluronic mask.')
    expect(out[0].attributes).toBeUndefined()
  })

  it('returns [] for empty ids without fetching', async () => {
    const fetchImpl = vi.fn()
    const out = await fetchWooProductDetails('https://shop.test', [], {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    })
    expect(out).toEqual([])
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})

describe('listWooProductsByUrl', () => {
  // Route-aware fake fetch: category listing, tag term lookup, product listing.
  function storeFetch(opts: { catSlug?: string; tagSlug?: string }) {
    return vi.fn(async (url: string) => {
      const u = String(url)
      let body: unknown = []
      if (u.includes('/products/categories')) {
        body = opts.catSlug ? [{ id: 7, slug: opts.catSlug }] : []
      } else if (u.includes('/wp/v2/product_tag')) {
        body = opts.tagSlug && u.includes(`slug=${opts.tagSlug}`) ? [{ id: 3103 }] : []
      } else if (u.includes('category=7') || u.includes('tag=3103')) {
        body = [sample]
      }
      return { ok: true, status: 200, json: async () => body, headers: new Headers() }
    }) as unknown as typeof fetch
  }

  it('resolves a category archive URL to its products', async () => {
    const fetchImpl = storeFetch({ catSlug: 'kvepalai' })
    const products = await listWooProductsByUrl(
      'https://shop.test',
      'https://shop.test/produkto-kategorija/kvepalai/',
      12,
      { fetchImpl },
    )
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Hydrating Eye Mask')
  })

  it('falls back to a tag term when no category slug matches', async () => {
    const fetchImpl = storeFetch({ tagSlug: 'natalijos-hitas' })
    const products = await listWooProductsByUrl(
      'https://shop.test',
      'https://homebynb.lt/produkto-zyma/natalijos-hitas/',
      12,
      { fetchImpl },
    )
    expect(products).toHaveLength(1)
  })

  it('returns [] when neither category nor tag resolves', async () => {
    const fetchImpl = storeFetch({})
    const products = await listWooProductsByUrl(
      'https://shop.test',
      'https://shop.test/about-us/',
      12,
      { fetchImpl },
    )
    expect(products).toEqual([])
  })

  it('returns [] for an unparseable page URL', async () => {
    const products = await listWooProductsByUrl('https://shop.test', 'not a url', 12, {
      fetchImpl: storeFetch({}),
    })
    expect(products).toEqual([])
  })
})
