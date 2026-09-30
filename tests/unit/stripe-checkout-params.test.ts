import { describe, expect, it, vi } from 'vitest'

const env = vi.hoisted(() => ({ STRIPE_TAX_ENABLED: undefined as string | undefined }))
vi.mock('@/lib/env', () => ({ getEnv: () => env }))

import { checkoutTaxParams } from '@/lib/stripe/client'

describe('checkoutTaxParams', () => {
  // Stripe enables Managed Payments (Stripe as merchant of record) by default;
  // without this opt-out setup-package checkouts fail with "tax code is missing".
  it('always opts Checkout out of Managed Payments — we are the merchant of record', () => {
    env.STRIPE_TAX_ENABLED = undefined
    expect(checkoutTaxParams()).toEqual({ managed_payments: { enabled: false } })

    env.STRIPE_TAX_ENABLED = 'true'
    expect(checkoutTaxParams()).toMatchObject({
      managed_payments: { enabled: false },
      automatic_tax: { enabled: true },
    })
  })
})
