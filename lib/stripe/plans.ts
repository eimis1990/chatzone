import 'server-only'
import type { Plan, BillingInterval } from '@/lib/types'
import { PLANS, PURCHASABLE_PLANS, DISPLAY_PLANS, POPULAR_PLAN, VOICE_ADDON } from '@/lib/plans-catalog'

// Re-export the shared catalog so existing server imports keep working.
export { PLANS, PURCHASABLE_PLANS, DISPLAY_PLANS, POPULAR_PLAN, VOICE_ADDON }
export type { PlanMeta } from '@/lib/plans-catalog'

/** Stripe Price ID for the Voice add-on (monthly), or null when not configured. */
export function getVoicePriceId(): string | null {
  return process.env.STRIPE_PRICE_VOICE_MONTH ?? null
}

/** Stripe Price ID for a one-time setup package, or null when not configured. */
export function getSetupPriceId(id: 'essential' | 'ecommerce'): string | null {
  const key = id === 'essential' ? 'STRIPE_PRICE_SETUP_ESSENTIAL' : 'STRIPE_PRICE_SETUP_ECOMMERCE'
  return process.env[key] ?? null
}

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
