import type { Plan } from '@/lib/types'

/**
 * What each plan is allowed to do. Single source of truth for plan-gating —
 * enforced server-side (widget-config, bot creation, settings). The marketing
 * feature bullets in lib/stripe/plans.ts should stay consistent with this.
 */
export interface Entitlements {
  /** Max bots an org can create (Infinity = unlimited). */
  maxBots: number
  /** Multiple languages (false = English only). */
  allLanguages: boolean
  /** Lead-capture form in the widget. */
  leadCapture: boolean
  /** Hide the "Powered by Loqara" badge in the widget. */
  removeBadge: boolean
  /** Configurable data-retention window. */
  customRetention: boolean
  /** Invite teammates with roles. */
  teams: boolean
  /** Included conversations / month (soft today; for metering later). */
  conversations: number
}

const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    maxBots: 1,
    allLanguages: false,
    leadCapture: false,
    removeBadge: false,
    customRetention: false,
    teams: false,
    conversations: 100,
  },
  starter: {
    maxBots: 1,
    allLanguages: true,
    leadCapture: true,
    removeBadge: true,
    customRetention: false,
    teams: false,
    conversations: 1500,
  },
  growth: {
    maxBots: 10,
    allLanguages: true,
    leadCapture: true,
    removeBadge: true,
    customRetention: false,
    teams: true,
    conversations: 4000,
  },
  scale: {
    maxBots: Infinity,
    allLanguages: true,
    leadCapture: true,
    removeBadge: true,
    customRetention: true,
    teams: true,
    conversations: 12000,
  },
  enterprise: {
    maxBots: Infinity,
    allLanguages: true,
    leadCapture: true,
    removeBadge: true,
    customRetention: true,
    teams: true,
    conversations: Infinity,
  },
}

/** Entitlements for a plan (falls back to Free for unknown values). */
export function entitlementsFor(plan: Plan | null | undefined): Entitlements {
  return ENTITLEMENTS[plan ?? 'free'] ?? ENTITLEMENTS.free
}
