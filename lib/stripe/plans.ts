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
  /** Short tagline. */
  blurb: string
  /** Headline features (mirrors the landing pricing table). */
  features: string[]
  /** Purchasable via Stripe Checkout (false for Free / Enterprise). */
  purchasable: boolean
}

export const PLANS: Record<Plan, PlanMeta> = {
  free: {
    plan: 'free',
    name: 'Free',
    monthly: 0,
    conversations: 100,
    blurb: 'Try Loqara on your store.',
    features: ['1 bot', 'English only', 'Live handoff to your team', 'Basic analytics'],
    purchasable: false,
  },
  starter: {
    plan: 'starter',
    name: 'Starter',
    monthly: 149,
    conversations: 1500,
    blurb: 'For growing stores.',
    features: [
      'Everything in Free',
      '2 bots',
      'Lead capture',
      'All languages',
      'Product search & order lookup',
      'Full analytics + CSAT',
      'Remove Loqara badge',
    ],
    purchasable: true,
  },
  growth: {
    plan: 'growth',
    name: 'Growth',
    monthly: 249,
    conversations: 4000,
    blurb: 'For busy teams.',
    features: [
      'Everything in Starter',
      'Up to 5 bots',
      'Priority support',
      'Domain allowlist',
      'Advanced analytics',
    ],
    purchasable: true,
  },
  scale: {
    plan: 'scale',
    name: 'Scale',
    monthly: 449,
    conversations: 12000,
    blurb: 'High-volume support.',
    features: [
      'Everything in Growth',
      'Unlimited bots',
      'Teams & roles',
      'Custom data retention',
      'Priority SLA',
    ],
    purchasable: true,
  },
  enterprise: {
    plan: 'enterprise',
    name: 'Enterprise',
    monthly: 0,
    conversations: 0,
    blurb: 'Custom volume & terms.',
    features: ['Unlimited volume', 'SSO & SLA', 'Dedicated support'],
    purchasable: false,
  },
}

/** The plans a customer can buy through self-serve Checkout, in display order. */
export const PURCHASABLE_PLANS: Plan[] = ['starter', 'growth', 'scale']

/** Plans shown as cards on the in-app subscription screen (Free + paid). */
export const DISPLAY_PLANS: Plan[] = ['free', 'starter', 'growth', 'scale']

/**
 * The Voice add-on — an extra item on the base subscription (not a separate
 * subscription). Flat monthly fee for now; ~200 minutes included, then
 * per-minute metering in a later pass.
 */
export const VOICE_ADDON = {
  key: 'voice',
  name: 'Voice agent',
  monthly: 49,
  minutesIncluded: 200,
  perMinute: 0.2,
  blurb: 'Let customers talk to your bot by voice. Real-time speech in and out.',
  features: ['~200 minutes included', 'Then €0.20 / min', 'Works with any paid plan'],
} as const

/** Stripe Price ID for the Voice add-on (monthly), or null when not configured. */
export function getVoicePriceId(): string | null {
  return process.env.STRIPE_PRICE_VOICE_MONTH ?? null
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
