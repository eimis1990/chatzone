import { describe, it, expect } from 'vitest'
import { getWooOrderStatus, normalizeWooOrder } from '@/lib/commerce/woocommerce'
import { getOrderStatus, getDiscount, orderLookupEnabled, type CommerceConfig } from '@/lib/commerce'

// Minimal fake fetch returning a fixed response.
function fakeFetch(status: number, body: unknown) {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: new Headers(),
  })) as unknown as typeof fetch
}

const ORDER = {
  id: 123,
  number: '1042',
  status: 'processing',
  currency: 'EUR',
  total: '39.99',
  date_created: '2026-06-01T10:00:00',
  billing: { email: 'Jane@Example.com' },
  line_items: [{ name: 'Bath Bomb &amp; Co', quantity: 2, total: '19.98' }],
  meta_data: [{ key: '_tracking_number', value: 'TRACK123' }],
}

describe('getWooOrderStatus — identity check', () => {
  it('returns the order when the email matches (case-insensitive)', async () => {
    const r = await getWooOrderStatus('https://store.com', 'ck_x', 'cs_y', { orderId: '#123', email: 'jane@example.com' }, { fetchImpl: fakeFetch(200, ORDER) })
    expect(r.found).toBe(true)
    expect(r.orderNumber).toBe('1042')
    expect(r.status).toBe('processing')
    expect(r.total).toBe('39.99')
    expect(r.currency).toBe('EUR')
    expect(r.items).toEqual([{ name: 'Bath Bomb & Co', quantity: 2, total: '19.98' }])
    expect(r.tracking?.number).toBe('TRACK123')
  })

  it('refuses on email mismatch and leaks no order data', async () => {
    const r = await getWooOrderStatus('https://store.com', 'ck_x', 'cs_y', { orderId: '123', email: 'attacker@evil.com' }, { fetchImpl: fakeFetch(200, ORDER) })
    expect(r.found).toBe(false)
    expect(r.reason).toBe('email_mismatch')
    expect(r.items).toBeUndefined()
    expect(r.total).toBeUndefined()
    expect(r.status).toBeUndefined()
  })

  it('returns not_found on 404', async () => {
    const r = await getWooOrderStatus('https://store.com', 'ck_x', 'cs_y', { orderId: '999', email: 'jane@example.com' }, { fetchImpl: fakeFetch(404, {}) })
    expect(r.found).toBe(false)
    expect(r.reason).toBe('not_found')
  })

  it('returns error on a non-OK, non-404 response', async () => {
    const r = await getWooOrderStatus('https://store.com', 'ck_x', 'cs_y', { orderId: '123', email: 'jane@example.com' }, { fetchImpl: fakeFetch(500, {}) })
    expect(r.found).toBe(false)
    expect(r.reason).toBe('error')
  })

  it('does not call the API without REST credentials', async () => {
    let called = false
    const spy = (async () => {
      called = true
      return { ok: true, status: 200, json: async () => ORDER, headers: new Headers() }
    }) as unknown as typeof fetch
    const r = await getWooOrderStatus('https://store.com', '', '', { orderId: '123', email: 'jane@example.com' }, { fetchImpl: spy })
    expect(r.reason).toBe('not_configured')
    expect(called).toBe(false)
  })

  it('rejects a non-numeric order id without calling the API', async () => {
    let called = false
    const spy = (async () => {
      called = true
      return { ok: true, status: 200, json: async () => ORDER, headers: new Headers() }
    }) as unknown as typeof fetch
    const r = await getWooOrderStatus('https://store.com', 'ck_x', 'cs_y', { orderId: 'abc', email: 'jane@example.com' }, { fetchImpl: spy })
    expect(r.reason).toBe('not_found')
    expect(called).toBe(false)
  })
})

describe('normalizeWooOrder', () => {
  it('maps fields and decodes item names', () => {
    const r = normalizeWooOrder(ORDER)
    expect(r.found).toBe(true)
    expect(r.items?.[0].name).toBe('Bath Bomb & Co')
    expect(r.orderNumber).toBe('1042')
  })
})

describe('getOrderStatus dispatch', () => {
  it('is not_configured when commerce is disabled', async () => {
    const config: CommerceConfig = { enabled: false, provider: 'woocommerce', storeUrl: '' }
    const r = await getOrderStatus(config, { orderId: '1', email: 'a@b.com' })
    expect(r.reason).toBe('not_configured')
  })
})

describe('getDiscount + orderLookupEnabled', () => {
  it('returns the configured discount when enabled', () => {
    const config: CommerceConfig = {
      enabled: true,
      provider: 'woocommerce',
      storeUrl: 'https://s.com',
      discount: { enabled: true, code: 'SAVE10', description: '10% off' },
    }
    expect(getDiscount(config)).toEqual({ enabled: true, code: 'SAVE10', description: '10% off' })
  })

  it('is disabled when no code or not enabled', () => {
    expect(getDiscount({ enabled: true, provider: 'woocommerce', storeUrl: '' })).toEqual({ enabled: false })
    expect(
      getDiscount({ enabled: true, provider: 'woocommerce', storeUrl: '', discount: { enabled: false, code: 'X' } }),
    ).toEqual({ enabled: false })
  })

  it('orderLookupEnabled requires store + REST creds', () => {
    expect(orderLookupEnabled({ enabled: true, provider: 'woocommerce', storeUrl: 'https://s.com', restKey: 'ck', restSecret: 'cs' })).toBe(true)
    expect(orderLookupEnabled({ enabled: true, provider: 'woocommerce', storeUrl: 'https://s.com' })).toBe(false)
    expect(orderLookupEnabled({ enabled: false, provider: 'woocommerce', storeUrl: 'https://s.com', restKey: 'ck', restSecret: 'cs' })).toBe(false)
  })
})
