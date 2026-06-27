import { describe, it, expect, vi } from 'vitest'
import {
  searchMagentoProducts,
  normalizeMagentoProduct,
  formatMagentoPrice,
  getMagentoOrderStatus,
  magentoBase,
} from '@/lib/commerce/magento'

const sampleItem = {
  uid: 'abc123',
  sku: 'SKU1',
  name: 'Crocs Classic Clog',
  url_key: 'crocs-classic-clog',
  canonical_url: 'crocs-classic-clog.html',
  stock_status: 'IN_STOCK',
  short_description: { html: '<p>Comfy <b>clogs</b> for the beach.</p>' },
  small_image: { url: 'https://shop.test/media/clog.jpg' },
  price_range: { minimum_price: { final_price: { value: 39.99, currency: 'EUR' } } },
}

describe('formatMagentoPrice', () => {
  it('formats value with currency code', () => {
    expect(formatMagentoPrice({ value: 39.99, currency: 'EUR' })).toBe('39.99 EUR')
  })
  it('returns empty when no value', () => {
    expect(formatMagentoPrice(undefined)).toBe('')
  })
})

describe('magentoBase', () => {
  it('reduces a deep URL to its origin', () => {
    expect(magentoBase('https://shop.test/catalog/category/123?x=1')).toBe('https://shop.test')
  })
})

describe('normalizeMagentoProduct', () => {
  it('maps GraphQL fields, strips HTML, and builds the URL from canonical_url', () => {
    const p = normalizeMagentoProduct(sampleItem, 'https://shop.test')
    expect(p).toEqual({
      id: 'abc123',
      title: 'Crocs Classic Clog',
      price: '39.99 EUR',
      url: 'https://shop.test/crocs-classic-clog.html',
      imageUrl: 'https://shop.test/media/clog.jpg',
      inStock: true,
      shortDescription: 'Comfy clogs for the beach.',
    })
  })
  it('marks out-of-stock items', () => {
    expect(normalizeMagentoProduct({ ...sampleItem, stock_status: 'OUT_OF_STOCK' }, 'https://shop.test').inStock).toBe(
      false,
    )
  })
})

describe('searchMagentoProducts', () => {
  it('POSTs the GraphQL search to /graphql and maps results', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { products: { items: [sampleItem] } } }), { status: 200 }),
    )
    const out = await searchMagentoProducts(
      'https://shop.test',
      { query: 'clogs', limit: 6 },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Crocs Classic Clog')
    const [calledUrl, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(String(calledUrl)).toBe('https://shop.test/graphql')
    expect(init.method).toBe('POST')
    expect(String(init.body)).toContain('products(search')
    expect(String(init.body)).toContain('clogs')
  })

  it('throws on a non-ok response', async () => {
    const fetchImpl = vi.fn(async () => new Response('err', { status: 500 }))
    await expect(
      searchMagentoProducts('https://shop.test', { query: 'x' }, { fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toThrow()
  })
})

describe('getMagentoOrderStatus', () => {
  const order = {
    increment_id: '000000123',
    status: 'processing',
    grand_total: 49.9,
    order_currency_code: 'EUR',
    customer_email: 'buyer@example.com',
    created_at: '2026-06-01 10:00:00',
    items: [{ name: 'Clog', qty_ordered: 1, row_total: 49.9 }],
  }

  it('returns not_configured without a token', async () => {
    const r = await getMagentoOrderStatus('https://shop.test', '', { orderId: '000000123', email: 'buyer@example.com' })
    expect(r).toEqual({ found: false, reason: 'not_configured' })
  })

  it('returns the order when the email matches', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [order] }), { status: 200 }))
    const r = await getMagentoOrderStatus(
      'https://shop.test',
      'tok',
      { orderId: '000000123', email: 'Buyer@example.com' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(r.found).toBe(true)
    expect(r.orderNumber).toBe('000000123')
    expect(r.currency).toBe('EUR')
    const [calledUrl, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(String(calledUrl)).toContain('/rest/V1/orders?')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('refuses to reveal an order when the email does not match', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ items: [{ ...order, customer_email: 'someone@else.com' }] }), { status: 200 }),
    )
    const r = await getMagentoOrderStatus(
      'https://shop.test',
      'tok',
      { orderId: '000000123', email: 'buyer@example.com' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(r).toEqual({ found: false, reason: 'email_mismatch' })
  })

  it('returns not_found when no order matches', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { status: 200 }))
    const r = await getMagentoOrderStatus(
      'https://shop.test',
      'tok',
      { orderId: '999', email: 'buyer@example.com' },
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    )
    expect(r).toEqual({ found: false, reason: 'not_found' })
  })
})
