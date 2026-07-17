import { describe, expect, it } from 'vitest'
import {
  fetchVerskisProductDetails,
  searchVerskisProducts,
  validateVerskisStore,
} from '@/lib/commerce/verskis'
import { fetchVerskisCatalog } from '@/lib/products/catalog'

const d = process.env.RUN_LIVE_COMMERCE ? describe : describe.skip

d('Verskis live store', () => {
  const store = 'https://www.mobel.lt/'

  it('validates the product sitemap', async () => {
    const result = await validateVerskisStore(store)
    expect(result.ok).toBe(true)
    expect(result.total).toBeGreaterThan(1_000)
  })

  it('returns normalized live search cards', async () => {
    const products = await searchVerskisProducts(store, { query: 'kėdė', limit: 4 })
    expect(products).toHaveLength(4)
    expect(products.every((product) => product.title && product.url && product.price)).toBe(true)
    expect(products.every((product) => product.imageUrl?.startsWith('https://www.mobel.lt/'))).toBe(true)
  })

  it('finds the exact Kapučino sofa through base-category detail enrichment', async () => {
    const products = await searchVerskisProducts(store, { query: 'sofa', limit: 10 })
    const cappuccino = products.find((product) => product.title === 'Sofa CA95931')
    expect(cappuccino?.id).not.toMatch(/^https?:/)
    expect(cappuccino?.details).toContain('Spalva: Kapučino')
    expect(cappuccino?.details).toContain('Ilgis: 284 cm')
  })

  it('returns live dimensions and color from a product page', async () => {
    const [details] = await fetchVerskisProductDetails(store, [
      'https://www.mobel.lt/sofa-ca69571',
    ])
    expect(details.title).toBe('Sofa CA69571')
    expect(details.attributes).toEqual(
      expect.arrayContaining(['Ilgis: 214 cm', 'Plotis: 102 cm']),
    )
    expect(details.attributes?.some((attribute) => attribute.startsWith('Spalva:'))).toBe(true)
  })

  it('builds a complete sync-ready catalog with rich attributes', async () => {
    const expected = await validateVerskisStore(store)
    const products = await fetchVerskisCatalog(store)
    expect(products).toHaveLength(expected.total)
    expect(products.length).toBeGreaterThan(1_000)
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length)
    const cappuccino = products.find((product) => product.title === 'Sofa CA95931')
    expect(cappuccino).toMatchObject({
      url: 'https://www.mobel.lt/sofa-ca95931',
      categories: expect.arrayContaining(['Sofos']),
      attributes: expect.arrayContaining(['Spalva: Kapučino', 'Ilgis: 284 cm']),
    })
  }, 120_000)
})
