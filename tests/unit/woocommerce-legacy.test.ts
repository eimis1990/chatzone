import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchStore, validateStore, getProductDetails, listStoreProductsByUrl } from '@/lib/commerce'
import { orderLookupEnabled, shippingInfoSupported, productDetailsSupported } from '@/lib/commerce/capabilities'
import { commerceProviderProfile, providerSearchQueryGuidance } from '@/lib/products/provider-profiles'
import { botConfigSchema, defaultBotConfig } from '@/lib/validation/schemas'

vi.mock('@/lib/net/ssrf', () => ({ assertPublicUrl: vi.fn() }))

const config = { enabled: true, provider: 'woocommerce_legacy' as const, storeUrl: 'https://catalogue.test' }
const item = {
  id: 9343, name: 'SUNRISE &amp; chairs', permalink: 'https://catalogue.test/index.php/product/sunrise/',
  is_purchasable: false, is_in_stock: true,
  prices: { price: '0', currency_minor_unit: 0, currency_prefix: '£' },
  images: [{ src: 'https://catalogue.test/chairs.jpg' }],
  short_description: '<p>Pine wood. Width 65 cm.</p>', description: '<p>Full dimensions: 65 x 65 x 70 cm.</p>',
  categories: [{ name: 'Outdoor' }], attributes: [{ name: 'Material', terms: [{ name: 'Pine' }] }],
}
function json(data: unknown, total = 113) {
  return new Response(JSON.stringify(data), { headers: { 'x-wp-total': String(total) } })
}
function fetchRows(rows = [item]) {
  return vi.fn<typeof fetch>().mockImplementation(async () => json(rows))
}
afterEach(() => vi.unstubAllGlobals())

describe('isolated legacy WooCommerce provider', () => {
  it('validates and searches the unversioned API using WordPress query routing', async () => {
    const fetchImpl = fetchRows()
    expect(await validateStore(config, { fetchImpl })).toEqual({ ok: true, total: 113 })
    const products = await searchStore(config, { query: 'oak & pine' }, { fetchImpl })
    const url = new URL(String(fetchImpl.mock.calls[1][0]))
    expect(url.origin).toBe(config.storeUrl)
    expect(url.searchParams.get('rest_route')).toBe('/wc/store/products')
    expect(url.searchParams.get('search')).toBe('oak & pine')
    expect(products[0]).toMatchObject({ id: '9343', title: 'SUNRISE & chairs', price: '', imageUrl: item.images[0].src })
    expect(products[0].shortDescription).toContain('Request a quote')
    expect(JSON.stringify(products)).not.toContain('£0')
  })

  it('does not change the standard WooCommerce endpoint or zero-price behavior', async () => {
    const fetchImpl = fetchRows()
    const products = await searchStore({ ...config, provider: 'woocommerce' }, { query: 'pine' }, { fetchImpl })
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/wp-json/wc/store/v1/products?')
    expect(products[0].price).toBe('£0')
    expect(products[0].shortDescription).not.toContain('Request a quote')
  })

  it('preserves genuine prices and explicitly purchasable free products on legacy stores', async () => {
    const fetchImpl = fetchRows([
      { ...item, is_purchasable: true, prices: { ...item.prices, price: '120' } },
      { ...item, id: 2, is_purchasable: true },
      { ...item, id: 3, prices: { ...item.prices, price: '120' } },
    ])
    const products = await searchStore(config, { query: '' }, { fetchImpl })
    expect(products.map(p => p.price)).toEqual(['£120', '£0', ''])
  })

  it('does not treat quote-only products as budget or cheapest matches', async () => {
    const fetchImpl = fetchRows()
    expect(await searchStore(config, { query: '', maxPrice: 100 }, { fetchImpl })).toEqual([])
    expect(await searchStore(config, { query: '', sort: 'price_asc' }, { fetchImpl })).toEqual([])
  })

  it('loads full details and page product cards through the same legacy transport', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async input => {
      const u = new URL(String(input))
      if (!u.searchParams.has('rest_route')) return new Response('<a data-product_id="9343">Chair</a>')
      return json([item])
    })
    const details = await getProductDetails(config, ['9343'], { fetchImpl })
    expect(details[0].description).toContain('65 x 65 x 70')
    expect(details[0].description).toContain('Request a quote')
    expect(details[0].attributes).toContain('Material: Pine')
    const cards = await listStoreProductsByUrl(config, `${config.storeUrl}/catalogue/`, 12, { fetchImpl })
    expect(cards[0].price).toBe('')
    expect(fetchImpl.mock.calls.some(([u]) => new URL(String(u)).searchParams.get('include') === '9343')).toBe(true)
  })

  it('syncs the whole catalogue and hydrates semantic matches without placeholder prices', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async input => {
      const url = new URL(String(input))
      expect(url.searchParams.get('rest_route')).toBe('/wc/store/products')
      if (url.searchParams.get('include')) return json([item])
      const page = Number(url.searchParams.get('page'))
      return json(Array.from({ length: page === 1 ? 100 : 13 }, (_, i) => ({ ...item, id: (page - 1) * 100 + i + 1 })))
    })
    vi.stubGlobal('fetch', fetchImpl)
    const profile = commerceProviderProfile(config)
    const progress = vi.fn()
    const rows = await profile.catalogSync!.fetch(config, progress)
    expect(rows).toHaveLength(113)
    expect(rows[0]).toMatchObject({ imageUrl: item.images[0].src, categories: ['Outdoor'], attributes: ['Material: Pine'] })
    expect(progress).toHaveBeenLastCalledWith(113)
    const hydrated = await profile.semantic!.hydrate(config, [{ external_id: '9343' }])
    expect(hydrated.get('9343')?.price).toBe('')
  })

  it('fails a partial or malformed catalogue instead of replacing a complete index', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async input => {
      if (new URL(String(input)).searchParams.get('page') === '1') return json(Array.from({ length: 100 }, (_, id) => ({ ...item, id })))
      return new Response('unavailable', { status: 503 })
    })
    vi.stubGlobal('fetch', fetchImpl)
    await expect(commerceProviderProfile(config).catalogSync!.fetch(config, vi.fn())).rejects.toThrow('503')
    fetchImpl.mockImplementation(async () => json({ error: 'not a product list' }))
    expect(await validateStore(config, { fetchImpl })).toEqual({ ok: false, total: 0 })
  })

  it('persists the new provider and keeps transactional capabilities disabled', () => {
    const parsed = botConfigSchema.parse({ ...defaultBotConfig('Catalogue'), commerce: config })
    expect(parsed.commerce.provider).toBe('woocommerce_legacy')
    expect(productDetailsSupported(config)).toBe(true)
    expect(orderLookupEnabled({ ...config, restKey: 'key', restSecret: 'secret' })).toBe(false)
    expect(shippingInfoSupported(config)).toBe(false)
    expect(providerSearchQueryGuidance(config)).toContain('quote')
    expect(providerSearchQueryGuidance({ provider: 'woocommerce' })).toBe('')
  })
})
