import { describe, it, expect } from 'vitest'
import { computeMrr, type BillingOrg } from '@/lib/billing/mrr'

const org = (o: Partial<BillingOrg>): BillingOrg => ({
  is_platform: false,
  plan: 'free',
  subscription_status: 'inactive',
  billing_interval: null,
  voice_addon: false,
  visualizer_addon: false,
  ...o,
})

describe('computeMrr', () => {
  it('counts an active monthly plan plus the voice add-on', () => {
    // Mirrors the live 3IMIS row: Growth (€249) + Voice (€49) = €298/mo.
    const r = computeMrr([org({ plan: 'growth', subscription_status: 'active', billing_interval: 'month', voice_addon: true })])
    expect(r.mrr).toBe(298)
    expect(r.arr).toBe(298 * 12)
    expect(r.payingClients).toBe(1)
    expect(r.byPlan).toEqual({ growth: 1 })
    expect(r.voiceAddons).toBe(1)
  })

  it('counts the room visualizer add-on into MRR', () => {
    const r = computeMrr([org({ plan: 'starter', subscription_status: 'active', billing_interval: 'month', visualizer_addon: true })])
    expect(r.mrr).toBe(149 + 29)
    expect(r.visualizerAddons).toBe(1)
  })

  it('normalizes an annual plan (billed 10×/yr) to a monthly figure', () => {
    // Starter €149/mo billed annually → 149*10/12 monthly-equivalent.
    const r = computeMrr([org({ plan: 'starter', subscription_status: 'active', billing_interval: 'year' })])
    expect(r.mrr).toBeCloseTo((149 * 10) / 12, 6)
  })

  it('excludes platform org, free/inactive/past_due, and enterprise-custom', () => {
    const r = computeMrr([
      org({ is_platform: true, plan: 'enterprise', subscription_status: 'active' }),
      org({ plan: 'growth', subscription_status: 'inactive' }),
      org({ plan: 'growth', subscription_status: 'past_due' }),
      org({ plan: 'free', subscription_status: 'active' }),
      org({ plan: 'enterprise', subscription_status: 'active' }),
    ])
    expect(r.mrr).toBe(0)
    expect(r.payingClients).toBe(0)
  })

  it('counts trialing as committed revenue', () => {
    const r = computeMrr([org({ plan: 'scale', subscription_status: 'trialing', billing_interval: 'month' })])
    expect(r.mrr).toBe(449)
    expect(r.payingClients).toBe(1)
  })
})
