import { z } from 'zod'

/**
 * Environment contract for the whole app.
 *
 * `parseEnv` is pure and testable. `getEnv` memoizes a validated view of
 * `process.env` and is for SERVER code only — it includes the service-role key,
 * which must never reach the browser bundle. Client components read the
 * `NEXT_PUBLIC_*` values directly (see lib/supabase/browser.ts).
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  // Optional: enables ElevenLabs text-to-speech. Voice features degrade
  // gracefully (503) when this is absent.
  ELEVENLABS_API_KEY: z.string().min(1).optional(),
  // Optional: enables Stripe billing. Checkout/portal/webhook degrade
  // gracefully (503) when these are absent, so the app runs without billing.
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Set to "true" ONLY after Stripe Tax is enabled in the Stripe dashboard
  // (origin address + registrations). Turns on automatic tax calculation,
  // billing-address collection, and VAT-ID collection in Checkout — enabling
  // this without dashboard setup makes Checkout session creation fail.
  STRIPE_TAX_ENABLED: z.string().min(1).optional(),
  // Bearer secret Vercel Cron sends to /api/cron/retention. The route fails
  // CLOSED when this is unset (retention purge simply won't run), so set it in
  // production to enable the daily purge.
  CRON_SECRET: z.string().min(1).optional(),
  // Optional: Jina Reader API key for higher crawl limits. URL ingestion works
  // keyless (IP rate-limited) and falls back to a direct fetch if unavailable.
  JINA_API_KEY: z.string().min(1).optional(),
  // Optional: enables transactional email (lead + handoff notifications).
  // Without a key, notifications are silently skipped.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Verified sender, e.g. "Loqara <notifications@loqara.com>". Falls back to
  // Resend's sandbox sender (delivers only to the account owner) when unset.
  EMAIL_FROM: z.string().min(1).optional(),
  // Optional comma-separated override for platform-owner pings (new signups).
  // Unset → the owner account's login email is used.
  OWNER_NOTIFY_EMAILS: z.string().min(1).optional(),
  // Optional, public (NEXT_PUBLIC_*): analytics & search-engine verification.
  // Read directly in client/layout code; listed here as the env contract's
  // single source of truth. GA4 only loads when the ID is present.
  NEXT_PUBLIC_GA_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_BING_SITE_VERIFICATION: z.string().min(1).optional(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid or missing environment variables: ${fields}`)
  }
  return parsed.data
}

let cached: Env | null = null

/** Server-only. Throws at first access if the environment is misconfigured. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env)
  return cached
}
