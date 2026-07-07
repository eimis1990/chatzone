import type { Plan } from '@/lib/types'

/**
 * The single source of truth for plan display data — used by BOTH the landing
 * pricing table and the in-app subscription screen, so they never drift. Keep
 * the feature bullets consistent with the enforced limits in lib/entitlements.ts.
 *
 * This module is plain data (no `server-only`) so client components can import
 * it. Stripe price-ID resolution lives in lib/stripe/plans.ts.
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
  /** Headline features. */
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
    features: ['1 bot', 'Single language', 'Live handoff to your team', 'Basic analytics'],
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

/** Plans shown as cards (landing + in-app subscription): Free + paid. */
export const DISPLAY_PLANS: Plan[] = ['free', 'starter', 'growth', 'scale']

/** The plan highlighted as "Most popular". */
export const POPULAR_PLAN: Plan = 'starter'

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
