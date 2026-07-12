import { describe, it, expect } from 'vitest'
import { buildDoc, deriveTags, type RawProduct } from '@/lib/products/catalog'

const base: RawProduct = {
  id: '1',
  title: 'Kvapni žvakė',
  url: 'https://x.lt/p/1',
  description: 'Sojų vaško žvakė',
  categories: ['Namų kvapai'],
  attributes: ['Kvapas: vanilė, levanda', 'Dydis: 250g'],
  onSale: false,
  featured: false,
  rank: 50,
}

describe('buildDoc', () => {
  it('embeds attributes so descriptive queries can match', () => {
    const doc = buildDoc(base, deriveTags(base), 'unisex')
    expect(doc).toContain('Attributes: Kvapas: vanilė, levanda; Dydis: 250g')
  })

  it('omits the attributes line when there are none', () => {
    const doc = buildDoc({ ...base, attributes: [] }, [], 'unisex')
    expect(doc).not.toContain('Attributes:')
  })

  it('still leads with the title and includes categories', () => {
    const doc = buildDoc(base, deriveTags(base), 'unisex')
    expect(doc.startsWith('Kvapni žvakė')).toBe(true)
    expect(doc).toContain('Categories: Namų kvapai')
  })
})

describe('fetchShopifyCatalog', () => {
  it('paginates with cursors, maps options to attributes, and productType+tags to categories', async () => {
    const { fetchShopifyCatalog } = await import('@/lib/products/catalog')
    const page = (nodes: unknown[], hasNextPage: boolean, endCursor: string | null) => ({
      data: { products: { pageInfo: { hasNextPage, endCursor }, edges: nodes.map((node) => ({ node })) } },
    })
    const pages = [
      page(
        [
          {
            id: 'gid://shopify/Product/1',
            title: 'Scented Candle',
            handle: 'scented-candle',
            onlineStoreUrl: null,
            description: 'A lovely  candle',
            productType: 'Candles',
            tags: ['home', 'gift'],
            featuredImage: { url: 'https://cdn/img.jpg' },
            options: [
              { name: 'Title', values: ['Default Title'] },
              { name: 'Scent', values: ['Vanilla', 'Lavender'] },
            ],
          },
        ],
        true,
        'cur1',
      ),
      page([{ id: 'gid://shopify/Product/2', title: 'Mug', handle: 'mug', options: [] }], false, null),
    ]
    let call = 0
    const fetchImpl = (async () => ({ ok: true, json: async () => pages[call++] })) as unknown as typeof fetch
    const products = await fetchShopifyCatalog('my-store.myshopify.com', 'tok', fetchImpl)
    expect(products).toHaveLength(2)
    expect(products[0].id).toBe('gid://shopify/Product/1')
    expect(products[0].url).toBe('https://my-store.myshopify.com/products/scented-candle')
    expect(products[0].categories).toEqual(['Candles', 'home', 'gift'])
    expect(products[0].attributes).toEqual(['Scent: Vanilla, Lavender'])
    expect(products[0].description).toBe('A lovely candle')
    expect(products[1].rank).toBe(1)
  })
})

describe('fetchMagentoCatalog', () => {
  it('paginates, uses SKU as the id, and strips description HTML', async () => {
    const { fetchMagentoCatalog } = await import('@/lib/products/catalog')
    const pages: Record<number, unknown[]> = {
      1: [
        {
          sku: 'VD01',
          name: 'Vanil&#279;s žvakė',
          url_key: 'vaniles-zvake',
          canonical_url: 'vaniles-zvake.html',
          short_description: { html: '<p>Kvapni &amp; jauki</p>' },
          categories: [{ name: 'Namų kvapai' }],
          small_image: { url: 'https://m/img.jpg' },
        },
        { sku: 'VD01', name: 'Duplicate' }, // cross-page dupe guard
      ],
      2: [],
    }
    const fetchImpl = (async (_url: string, init: { body: string }) => {
      const page = JSON.parse(init.body).variables.page as number
      return { ok: true, json: async () => ({ data: { products: { items: pages[page] ?? [] } } }) }
    }) as unknown as typeof fetch
    const products = await fetchMagentoCatalog('https://shop.example.lt/store', fetchImpl)
    expect(products).toHaveLength(1)
    expect(products[0].id).toBe('VD01')
    expect(products[0].title).toBe('Vanilės žvakė')
    expect(products[0].url).toBe('https://shop.example.lt/vaniles-zvake.html')
    expect(products[0].description).toBe('Kvapni & jauki')
    expect(products[0].categories).toEqual(['Namų kvapai'])
  })
})

describe('fetchWooCatalog', () => {
  it('dedupes products repeated across pages (popularity order shifts)', async () => {
    const { fetchWooCatalog } = await import('@/lib/products/catalog')
    const pages: Record<number, Array<{ id: number; name: string }>> = {
      1: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `P${i + 1}` })),
      // Page 2 re-serves product 100 (order shifted between requests), then ends.
      2: [{ id: 100, name: 'P100' }, { id: 101, name: 'P101' }],
    }
    const fetchImpl = (async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'))
      return { ok: true, json: async () => pages[page] ?? [] }
    }) as unknown as typeof fetch
    const products = await fetchWooCatalog('https://x.lt', fetchImpl)
    const ids = products.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('101')
    expect(ids.filter((i) => i === '100')).toHaveLength(1)
  })
})

describe('fetchWooCatalog progress', () => {
  it('reports the running count after each page', async () => {
    const { fetchWooCatalog } = await import('@/lib/products/catalog')
    const page = (n: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({ id: n * 1000 + i, name: `P${n}-${i}` }))
    let calls = 0
    const fetchImpl = (async () => {
      calls++
      // two full pages then a short page ends pagination
      const body = calls === 1 ? page(1, 100) : calls === 2 ? page(2, 100) : page(3, 5)
      return new Response(JSON.stringify(body), { status: 200 })
    }) as unknown as typeof fetch
    const seen: number[] = []
    const out = await fetchWooCatalog('https://shop.test', fetchImpl, (n) => seen.push(n))
    expect(out).toHaveLength(205)
    expect(seen).toEqual([100, 200, 205])
  })
})

describe('productRawHash', () => {
  const p = { ...base, rank: 50 }

  it('is stable for identical inputs and ignores popularity jitter within the bucket', async () => {
    const { productRawHash } = await import('@/lib/products/catalog')
    expect(productRawHash(p)).toBe(productRawHash({ ...p }))
    // rank 50 → 60: same non-top-seller bucket, must NOT re-enrich the catalog
    expect(productRawHash({ ...p, rank: 60 })).toBe(productRawHash(p))
  })

  it('changes when content or the top-seller bucket changes', async () => {
    const { productRawHash } = await import('@/lib/products/catalog')
    expect(productRawHash({ ...p, title: 'Nauja žvakė' })).not.toBe(productRawHash(p))
    expect(productRawHash({ ...p, onSale: true })).not.toBe(productRawHash(p))
    expect(productRawHash({ ...p, rank: 5 })).not.toBe(productRawHash(p)) // crosses TOP_SELLER_RANK
  })
})
