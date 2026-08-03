import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  subscriptionList,
  organizationSingle,
  resetMissingStripeCustomer,
  syncSubscriptionToOrg,
} = vi.hoisted(() => ({
  subscriptionList: vi.fn(),
  organizationSingle: vi.fn(),
  resetMissingStripeCustomer: vi.fn(),
  syncSubscriptionToOrg: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  getStripe: () => ({ subscriptions: { list: subscriptionList } }),
  requireStripe: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ single: organizationSingle }),
      }),
    }),
  }),
}))

vi.mock('@/lib/stripe/customer', () => ({
  resetMissingStripeCustomer,
}))

vi.mock('@/lib/stripe/sync', () => ({
  syncSubscriptionToOrg,
}))

vi.mock('@/lib/stripe/plans', () => ({
  getVoicePriceId: () => null,
  getVisualizerPriceId: () => null,
  planFromPriceId: () => null,
}))

import { activeSubscriptionId, reconcileOrgFromStripe } from '@/lib/stripe/manage'

const ORG_ID = 'org-1'
const CUSTOMER_ID = 'cus_missing'

beforeEach(() => {
  vi.clearAllMocks()
  organizationSingle.mockResolvedValue({
    data: { stripe_customer_id: CUSTOMER_ID },
  })
})

describe('Stripe subscription reconciliation', () => {
  it('repairs a missing customer instead of crashing the subscription page', async () => {
    subscriptionList.mockRejectedValue({
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      message: `No such customer: '${CUSTOMER_ID}'`,
    })

    await expect(reconcileOrgFromStripe(ORG_ID)).resolves.toBeUndefined()
    expect(resetMissingStripeCustomer).toHaveBeenCalledWith(ORG_ID, CUSTOMER_ID)
    expect(syncSubscriptionToOrg).not.toHaveBeenCalled()
  })

  it('still propagates unrelated Stripe failures', async () => {
    const outage = new Error('Stripe unavailable')
    subscriptionList.mockRejectedValue(outage)

    await expect(reconcileOrgFromStripe(ORG_ID)).rejects.toBe(outage)
    expect(resetMissingStripeCustomer).not.toHaveBeenCalled()
  })

  it('returns the current paying subscription when Stripe has the customer', async () => {
    subscriptionList.mockResolvedValue({
      data: [
        { id: 'sub_canceled', status: 'canceled' },
        { id: 'sub_active', status: 'active' },
      ],
    })

    await expect(activeSubscriptionId(ORG_ID)).resolves.toBe('sub_active')
    expect(resetMissingStripeCustomer).not.toHaveBeenCalled()
  })
})
