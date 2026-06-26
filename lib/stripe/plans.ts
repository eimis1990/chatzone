import 'server-only'
import type { Plan, BillingInterval } from '@/lib/types'

/**
 * The plan catalog — mirrors the pricing shown on the landing page. Stripe
 * Price IDs are NOT hard-coded here: they live in environment variables (they
 * differ between test and live mode and aren't secret), and are looked up by a
 * deterministic naming convention so adding a plan is just adding two env vars.
 *
 *   STRIPE_PRICE_STARTER_MONTH = price_…
 *   STRIPE_PRICE_STARTER_YEAR  = price_…
 *   …GROWTH_… , …SCALE_…
 *
 * Free and Enterprise are not self-serve purchasable (no Checkout price).
 */
export interface PlanMeta {
  plan: Plan
  name: string
  /** Headline monthly price in EUR; annual is billed at 10× (≈2 months free). */
  monthly: number
  /** Included conversations per month. */
  conversations: number
  /** Purchasable via Stripe Checkout (false for Free / Enterprise). */
  purchasable: boolean
}

export const PLANS: Record<Plan, PlanMeta> = {
  free: { plan: 'free', name: 'Free', monthly: 0, conversations: 100, purchasable: false },
  starter: { plan: 'starter', name: 'Starter', monthly: 149, conversations: 1500, purchasable: true },
  growth: { plan: 'growth', name: 'Growth', monthly: 249, conversations: 4000, purchasable: true },
  scale: { plan: 'scale', name: 'Scale', monthly: 449, conversations: 12000, purchasable: true },
  enterprise: { plan: 'enterprise', name: 'Enterprise', monthly: 0, conversations: 0, purchasable: false },
}

/** The plans a customer can buy through self-serve Checkout, in display order. */
export const PURCHASABLE_PLANS: Plan[] = ['starter', 'growth', 'scale']

function priceEnvKey(plan: Plan, interval: BillingInterval): string {
  return `STRIPE_PRICE_${plan.toUpperCase()}_${interval === 'year' ? 'YEAR' : 'MONTH'}`
}

/** Stripe Price ID for a plan+interval, or null when not configured. */
export function getPriceId(plan: Plan, interval: BillingInterval): string | null {
  return process.env[priceEnvKey(plan, interval)] ?? null
}

/** Reverse-map a Stripe Price ID to its plan+interval — used by the webhook. */
export function planFromPriceId(priceId: string): { plan: Plan; interval: BillingInterval } | null {
  for (const plan of PURCHASABLE_PLANS) {
    for (const interval of ['month', 'year'] as BillingInterval[]) {
      if (getPriceId(plan, interval) === priceId) return { plan, interval }
    }
  }
  return null
}
