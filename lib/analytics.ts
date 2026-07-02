import { track } from '@vercel/analytics'

/**
 * Centralised custom-event tracking for Vercel Web Analytics.
 *
 * Page *views* are captured automatically by the <Analytics/> component in the
 * root layout — so navigation between app sections already shows up. This file
 * is for explicit *actions* (what people do, not just where they go), with the
 * event names and property shapes defined once so they stay consistent and
 * show up cleanly in the Vercel dashboard.
 *
 * Vercel only allows primitive property values (string | number | boolean | null),
 * and the helper is client-only — call it from `'use client'` components.
 *
 * See: https://vercel.com/docs/analytics/custom-events
 */
type Primitive = string | number | boolean | null

export interface AnalyticsEvents {
  // ── Landing / acquisition ──────────────────────────────────────────────
  /** Early-access email form submitted (fires on attempt). */
  signup_submitted: { source: string }
  /** Email accepted by the API. */
  signup_succeeded: { source: string }
  /** Email rejected or network error. */
  signup_failed: { source: string; reason: string }
  /** The "Get started" signup dialog was opened (before any submit). */
  get_started_opened: { source: string }
  /** A top-nav anchor was clicked (Features / How it works / Pricing / FAQ). */
  nav_click: { target: string }
  /** The "Sign in" button was clicked. */
  signin_click: { location: string }
  /** Pricing billing period switched. */
  pricing_billing_toggled: { period: 'monthly' | 'annual' }
  /** A pricing plan's CTA was clicked. */
  pricing_plan_click: { plan: string; period: 'monthly' | 'annual'; price: number }
  /** An FAQ accordion item was expanded. */
  faq_opened: { question: string }

  // ── Logged-in app usage ────────────────────────────────────────────────
  /** A new bot was created. */
  bot_created: { orgId: string }
  /** A bot's appearance/behaviour config was saved. */
  bot_config_saved: { botId: string }
  /** The embed snippet was copied to the clipboard. */
  embed_code_copied: { botId: string }
  /** A knowledge source was added and ingestion started. */
  knowledge_source_added: { type: 'text' | 'qa' | 'url' | 'file' }

  // ── Client onboarding wizard (/app/onboarding) ─────────────────────────
  /** The onboarding wizard was opened. */
  onboarding_started: { orgId: string }
  /** A wizard step was completed (step id, e.g. "business", "teach"). */
  onboarding_step_completed: { step: string; botId: string | null }
  /** The wizard was finished (user landed on their new bot). */
  onboarding_finished: { botId: string }
}

/**
 * Fire a typed custom event. Unknown names / wrong property shapes are caught
 * at compile time. No-ops outside the browser and when analytics is disabled.
 */
export function trackEvent<K extends keyof AnalyticsEvents>(
  name: K,
  props: AnalyticsEvents[K],
): void {
  track(name as string, props as Record<string, Primitive>)
}
