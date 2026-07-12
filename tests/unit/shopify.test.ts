import { describe, it, expect } from 'vitest'
import {
  searchShopifyProducts,
  fetchShopifyProductDetails,
  validateShopifyStore,
  normalizeShopifyProduct,
  formatShopifyMoney,
  shopifyDomain,
} from '@/lib/commerce/shopify'
import {
  searchStore,
  validateStore,
  storeConfigured,
  getProductDetails,
  productDetailsSupported,
  type CommerceConfig,
} from '@/lib/commerce'

function gqlFetch(body: unknown, ok = true) {
  return (async () => ({ ok, status: ok ? 200 : 500, json: async () => body })) as unknown as typeof fetch
}

const NODE = {
  id: 'gid://shopify/Product/1',
  title: 'Bath Bomb',
  handle: 'bath-bomb',
  onlineStoreUrl: 'https://store.com/products/bath-bomb',
  availableForSale: true,
  description: '  A fizzy   bath bomb.  ',
  featuredImage: { url: 'https://cdn/img.jpg' },
  priceRange: { minVariantPrice: { amount: '3.5', currencyCode: 'EUR' } },
}

const RESPONSE = { data: { products: { edges: [{ node: NODE }] } } }

describe('shopify helpers', () => {
  it('shopifyDomain strips protocol + trailing slash', () => {
    expect(shopifyDomain('https://store.myshopify.com/')).toBe('store.myshopify.com')
    expect(shopifyDomain('store.com')).toBe('store.com')
  })

  it('formatShopifyMoney formats amount + currency', () => {
    expect(formatShopifyMoney({ amount: '3.5', currencyCode: 'EUR' })).toBe('3.50 EUR')
    expect(formatShopifyMoney(undefined)).toBe('')
  })

  it('normalizeShopifyProduct maps fields', () => {
    const p = normalizeShopifyProduct(NODE, 'store.com')
    expect(p.title).toBe('Bath Bomb')
    expect(p.price).toBe('3.50 EUR')
    expect(p.url).toBe('https://store.com/products/bath-bomb')
    expect(p.imageUrl).toBe('https://cdn/img.jpg')
    expect(p.inStock).toBe(true)
    expect(p.shortDescription).toBe('A fizzy bath bomb.')
  })

  it('falls back to a constructed URL + out-of-stock flag', () => {
    const p = normalizeShopifyProduct(
      { ...NODE, onlineStoreUrl: null, availableForSale: false },
      'https://store.myshopify.com/',
    )
    expect(p.url).toBe('https://store.myshopify.com/products/bath-bomb')
    expect(p.inStock).toBe(false)
  })
})

describe('searchShopifyProducts', () => {
  it('returns normalized products from the GraphQL response', async () => {
    const products = await searchShopifyProducts('store.com', 'tok', { query: 'bath' }, { fetchImpl: gqlFetch(RESPONSE) })
    expect(products).toHaveLength(1)
    expect(products[0].title).toBe('Bath Bomb')
  })

  it('throws on a non-OK HTTP response', async () => {
    await expect(
      searchShopifyProducts('store.com', 'tok', { query: 'x' }, { fetchImpl: gqlFetch({}, false) }),
    ).rejects.toThrow()
  })
})

describe('validateShopifyStore', () => {
  it('ok when products are returned', async () => {
    const r = await validateShopifyStore('store.com', 'tok', { fetchImpl: gqlFetch(RESPONSE) })
    expect(r.ok).toBe(true)
  })
  it('fails on GraphQL errors', async () => {
    const r = await validateShopifyStore('store.com', 'tok', { fetchImpl: gqlFetch({ errors: [{ message: 'bad token' }] }) })
    expect(r.ok).toBe(false)
  })
})

describe('provider dispatch', () => {
  const shopifyConfig: CommerceConfig = {
    enabled: true,
    provider: 'shopify',
    storeUrl: '',
    shopifyDomain: 'store.com',
    shopifyToken: 'tok',
  }

  it('storeConfigured is provider-aware', () => {
    expect(storeConfigured(shopifyConfig)).toBe(true)
    expect(storeConfigured({ ...shopifyConfig, shopifyToken: '' })).toBe(false)
    expect(storeConfigured({ enabled: true, provider: 'woocommerce', storeUrl: 'https://s.com' })).toBe(true)
    expect(storeConfigured({ enabled: true, provider: 'woocommerce', storeUrl: '' })).toBe(false)
  })

  it('searchStore dispatches to Shopify', async () => {
    const products = await searchStore(shopifyConfig, { query: 'bath' }, { fetchImpl: gqlFetch(RESPONSE) })
    expect(products[0].title).toBe('Bath Bomb')
  })

  it('validateStore dispatches to Shopify', async () => {
    const r = await validateStore(shopifyConfig, { fetchImpl: gqlFetch(RESPONSE) })
    expect(r.ok).toBe(true)
  })

  it('getProductDetails dispatches to Shopify and productDetailsSupported gates providers', async () => {
    const detailsResponse = {
      data: {
        nodes: [
          {
            id: 'gid://shopify/Product/1',
            title: 'Bath Bomb',
            description: 'A fizzy bath bomb with lavender oil.',
            options: [
              { name: 'Title', values: ['Default Title'] },
              { name: 'Scent', values: ['Lavender', 'Rose'] },
            ],
          },
        ],
      },
    }
    const details = await getProductDetails(shopifyConfig, ['gid://shopify/Product/1'], {
      fetchImpl: gqlFetch(detailsResponse),
    })
    expect(details).toEqual([
      {
        id: 'gid://shopify/Product/1',
        title: 'Bath Bomb',
        description: 'A fizzy bath bomb with lavender oil.',
        attributes: ['Scent: Lavender, Rose'],
      },
    ])
    expect(productDetailsSupported(shopifyConfig)).toBe(true)
    expect(productDetailsSupported({ enabled: true, provider: 'feed', storeUrl: '', feedUrl: 'https://x/f.xml' })).toBe(false)
  })
})

describe('fetchShopifyProductDetails', () => {
  it('returns [] for empty ids without fetching', async () => {
    let called = false
    const fetchImpl = (async () => { called = true; return { ok: true, status: 200, json: async () => ({}) } }) as unknown as typeof fetch
    expect(await fetchShopifyProductDetails('store.com', 'tok', [], { fetchImpl })).toEqual([])
    expect(called).toBe(false)
  })

  it('skips null nodes and omits empty attributes', async () => {
    const resp = { data: { nodes: [null, { id: 'gid://shopify/Product/2', title: 'Soap', description: 'Plain soap.' }] } }
    const out = await fetchShopifyProductDetails('store.com', 'tok', ['a', 'b'], { fetchImpl: gqlFetch(resp) })
    expect(out).toEqual([{ id: 'gid://shopify/Product/2', title: 'Soap', description: 'Plain soap.' }])
  })
})
