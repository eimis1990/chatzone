import { PLANS, VOICE_ADDON, VISUALIZER_ADDON } from '@/lib/plans-catalog'
import type { Plan, BillingInterval, SubscriptionStatus } from '@/lib/types'

/** The billing columns from `organizations` needed to compute revenue. */
export interface BillingOrg {
  is_platform: boolean
  plan: Plan
  subscription_status: SubscriptionStatus
  billing_interval: BillingInterval | null
  voice_addon: boolean
  visualizer_addon: boolean
}

export interface MrrBreakdown {
  /** Monthly recurring revenue in EUR (annual subs normalized to a month). */
  mrr: number
  /** Annual run-rate (mrr × 12). */
  arr: number
  payingClients: number
  /** Count of paying clients per plan, e.g. { growth: 1 }. */
  byPlan: Partial<Record<Plan, number>>
  voiceAddons: number
  visualizerAddons: number
}

// Statuses that represent committed revenue. `past_due` is excluded — we're not
// reliably collecting it; `canceled`/`unpaid`/`inactive` obviously don't count.
const PAYING: SubscriptionStatus[] = ['active', 'trialing']

/**
 * Current monthly-normalized recurring revenue from the live org billing state.
 * Prices come from the in-code plan catalog (the declared source of truth), so
 * no Stripe call is needed. The platform's own org is always excluded.
 */
export function computeMrr(orgs: BillingOrg[]): MrrBreakdown {
  let mrr = 0
  let payingClients = 0
  let voiceAddons = 0
  let visualizerAddons = 0
  const byPlan: Partial<Record<Plan, number>> = {}

  for (const o of orgs) {
    if (o.is_platform) continue
    if (!PAYING.includes(o.subscription_status)) continue

    const base = PLANS[o.plan].monthly
    if (base <= 0) continue // free / enterprise-custom contribute nothing here

    // Annual is billed at 10×/yr (≈2 months free) → normalize to a month.
    const monthlyBase = o.billing_interval === 'year' ? (base * 10) / 12 : base
    const voice = o.voice_addon ? VOICE_ADDON.monthly : 0
    const visualizer = o.visualizer_addon ? VISUALIZER_ADDON.monthly : 0

    mrr += monthlyBase + voice + visualizer
    payingClients += 1
    byPlan[o.plan] = (byPlan[o.plan] ?? 0) + 1
    if (o.voice_addon) voiceAddons += 1
    if (o.visualizer_addon) visualizerAddons += 1
  }

  return { mrr, arr: mrr * 12, payingClients, byPlan, voiceAddons, visualizerAddons }
}
