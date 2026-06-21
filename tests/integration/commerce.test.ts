// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { searchWooProducts, validateWooStore } from '@/lib/commerce/woocommerce'

// Live check against a real WooCommerce store. Gated behind RUN_LIVE_COMMERCE=1.
const live = process.env.RUN_LIVE_COMMERCE === '1'
const d = live ? describe : describe.skip
const STORE = process.env.LIVE_STORE_URL ?? 'https://homebynb.lt'

d('WooCommerce live store', () => {
  it('validates the store and reports a catalog total', async () => {
    const { ok, total } = await validateWooStore(STORE)
    expect(ok).toBe(true)
    expect(total).toBeGreaterThan(0)
  })

  it('searches products with a price filter', async () => {
    const products = await searchWooProducts(STORE, { query: 'kauke', maxPrice: 30, limit: 4 })
    expect(products.length).toBeGreaterThan(0)
    const p = products[0]
    expect(p.title).toBeTruthy()
    expect(p.url).toMatch(/^https?:\/\//)
    expect(p.price).toBeTruthy()
  }, 30000)
})
