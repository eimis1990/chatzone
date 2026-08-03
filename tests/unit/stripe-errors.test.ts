import { describe, expect, it } from 'vitest'
import { isMissingStripeCustomerError } from '@/lib/stripe/errors'

describe('isMissingStripeCustomerError', () => {
  it('recognizes a missing customer returned by Stripe', () => {
    expect(
      isMissingStripeCustomerError({
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        param: 'customer',
        message: "No such customer: 'cus_missing'",
      }),
    ).toBe(true)
  })

  it('does not mistake another missing Stripe resource for a customer', () => {
    expect(
      isMissingStripeCustomerError({
        type: 'StripeInvalidRequestError',
        code: 'resource_missing',
        message: "No such price: 'price_missing'",
      }),
    ).toBe(false)
  })

  it('does not swallow unrelated Stripe failures', () => {
    expect(
      isMissingStripeCustomerError({
        type: 'StripeAPIError',
        code: 'api_error',
        message: 'Stripe is temporarily unavailable',
      }),
    ).toBe(false)
  })
})
