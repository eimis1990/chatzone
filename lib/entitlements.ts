import type { Plan } from '@/lib/types'

/**
 * What each plan is allowed to do. Single source of truth for plan-gating —
 * enforced server-side (widget-config, bot creation, settings). The marketing
 * feature bullets in lib/stripe/plans.ts should stay consistent with this.
 */
export interface Entitlements {
  /** Max bots an org can create (Infinity = unlimited). */
  maxBots: number
  /** Max distinct visitor languages a bot may offer (1 = single language). */
  maxLanguages: number
  /** Lead-capture form in the widget. */
  leadCapture: boolean
  /** Hide the "Powered by Loqara" badge in the widget. */
  removeBadge: boolean
  /** Configurable data-retention window. */
  customRetention: boolean
  /** Invite teammates with roles. */
  teams: boolean
  /** Voice dictation in the widget composer (Whisper speech-to-text). */
  dictation: boolean
  /** Included conversations / month (soft today; for metering later). */
  conversations: number
}

const ENTITLEMENTS: Record<Plan, Entitlements> = {
  free: {
    maxBots: 1,
    maxLanguages: 1,
    leadCapture: false,
    removeBadge: false,
    customRetention: false,
    teams: false,
    dictation: false,
    conversations: 100,
  },
  starter: {
    maxBots: 2,
    maxLanguages: Infinity,
    leadCapture: true,
    removeBadge: true,
    customRetention: false,
    teams: false,
    dictation: true,
    conversations: 1500,
  },
  growth: {
    maxBots: 5,
    maxLanguages: Infinity,
    leadCapture: true,
    removeBadge: true,
    customRetention: false,
    teams: false,
    dictation: true,
    conversations: 4000,
  },
  scale: {
    maxBots: Infinity,
    maxLanguages: Infinity,
    leadCapture: true,
    removeBadge: true,
    customRetention: true,
    teams: true,
    dictation: true,
    conversations: 12000,
  },
  enterprise: {
    maxBots: Infinity,
    maxLanguages: Infinity,
    leadCapture: true,
    removeBadge: true,
    customRetention: true,
    teams: true,
    dictation: true,
    conversations: Infinity,
  },
}

/** Entitlements for a plan (falls back to Free for unknown values). */
export function entitlementsFor(plan: Plan | null | undefined): Entitlements {
  return ENTITLEMENTS[plan ?? 'free'] ?? ENTITLEMENTS.free
}

/**
 * Internal orgs — the platform org (owner's own chatbot, `is_platform`) and the
 * demo org (prospect showcase bots, `is_demo`) — always have every paid add-on,
 * bypassing the Stripe paywall and any per-month pools. Client orgs never do.
 * The single predicate every add-on gate should use, so the two internal orgs
 * behave identically everywhere.
 */
export function isInternalOrg(org: { is_demo?: boolean | null; is_platform?: boolean | null } | null | undefined): boolean {
  return Boolean(org?.is_demo || org?.is_platform)
}
