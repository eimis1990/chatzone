// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getProductDetails, searchStore, validateStore } from '@/lib/commerce'
import { commerceProviderProfile } from '@/lib/products/provider-profiles'

// Public reads only; no bot/database writes or model calls.
const live = process.env.RUN_LIVE_LEGACY_COMMERCE === '1'
const config = {
  enabled: true,
  provider: 'woocommerce_legacy' as const,
  storeUrl: 'https://woodfurniture.eu',
}

describe.skipIf(!live)('Woodfurniture legacy catalogue', () => {
  it('validates and finds GLOW without exposing the placeholder price', async () => {
    const validation = await validateStore(config)
    expect(validation.ok).toBe(true)
    expect(validation.total).toBeGreaterThan(100)
    const products = await searchStore(config, { query: 'glow' })
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({ title: 'Home desk GLOW', price: '' })
    expect(products[0].imageUrl).toMatch(/^https:\/\//)
    const details = await getProductDetails(config, [products[0].id])
    expect(details[0].description).toContain('120')
    expect(details[0].description).toContain('Request a quote')
  }, 45_000)

  it('fetches the complete catalogue and hydrates indexed IDs through the legacy route', async () => {
    const validation = await validateStore(config)
    const profile = commerceProviderProfile(config)
    const rows = await profile.catalogSync!.fetch(config, () => {})
    expect(rows.length).toBe(validation.total)
    expect(new Set(rows.map(p => p.id)).size).toBe(rows.length)
    expect(rows.every(p => p.imageUrl && p.description)).toBe(true)
    const glow = rows.find(p => p.title === 'Home desk GLOW')!
    expect(glow).toBeDefined()
    const products = await profile.semantic!.hydrate(config, [{ external_id: glow.id }])
    expect(products.get(glow.id)?.price).toBe('')
    expect(products.get(glow.id)?.title).toBe(glow.title)
  }, 45_000)
})
