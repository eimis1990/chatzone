import 'server-only'
import Stripe from 'stripe'
import { getEnv } from '@/lib/env'

/**
 * Server-only Stripe client. Billing is optional: when STRIPE_SECRET_KEY is
 * absent the helpers report "not configured" so the checkout/portal/webhook
 * routes can degrade gracefully (503) instead of crashing the app.
 *
 * We pin no explicit apiVersion — the SDK uses the account's default, which
 * keeps us off a hard-coded version string that drifts out of date.
 */
let cached: Stripe | null = null

export function isStripeConfigured(): boolean {
  return Boolean(getEnv().STRIPE_SECRET_KEY)
}

/** Returns the Stripe client, or null when billing isn't configured. */
export function getStripe(): Stripe | null {
  const key = getEnv().STRIPE_SECRET_KEY
  if (!key) return null
  if (!cached) {
    cached = new Stripe(key, { typescript: true })
  }
  return cached
}

/** Like getStripe() but throws — use in paths that require billing. */
export function requireStripe(): Stripe {
  const stripe = getStripe()
  if (!stripe) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).')
  return stripe
}

/**
 * Checkout params for automatic tax (Stripe Tax). Off until STRIPE_TAX_ENABLED
 * is set to "true" — flipping it on requires Stripe Tax to be activated in the
 * dashboard first (origin address + registrations), otherwise session creation
 * errors. `customer_update` is required by Stripe when combining an existing
 * customer with automatic_tax/tax_id_collection: it saves the address and
 * business name collected in Checkout back onto the customer.
 */
export function checkoutTaxParams(): Pick<
  Stripe.Checkout.SessionCreateParams,
  'automatic_tax' | 'billing_address_collection' | 'tax_id_collection' | 'customer_update'
> {
  if (getEnv().STRIPE_TAX_ENABLED !== 'true') return {}
  return {
    automatic_tax: { enabled: true },
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
  }
}
