/**
 * POST /api/signup
 *
 * Public "Get started" capture from the landing page dialog. Stores email +
 * website (deduped by email), rate-limited, and pings the platform owner so
 * new prospects never sit unnoticed. Same-origin only (no CORS).
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createRateLimiter } from '@/lib/ratelimit'
import { notifyNewSignup } from '@/lib/notify'

const limiter = createRateLimiter({ capacity: 3, refillPerSec: 0.05 })

const bodySchema = z.object({
  email: z.string().email().max(200),
  company: z.string().max(80).optional(),
  website: z.string().max(200).optional(),
  source: z.string().max(40).optional(),
  /** Honeypot — hidden field in the dialog; anything here means a bot. */
  confirm_url: z.string().max(500).optional(),
  /** Milliseconds the form was open before submit; instant = scripted. */
  t: z.number().optional(),
})

/** At least two letters (any alphabet) — filters "5413543554"-style junk. */
const HAS_LETTERS = /\p{L}[\s\S]*\p{L}/u

export async function POST(req: Request) {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Enter a valid email.' }, 400)
  const email = parsed.data.email.trim().toLowerCase()
  const company = parsed.data.company?.trim() || null
  const website = parsed.data.website?.trim() || null

  // Bot filters. Fake success on the silent signals (honeypot filled, or the
  // form submitted faster than a human could read it) — a 4xx would only teach
  // the script what to fix. A letters-free company name gets a real error,
  // since a person may have typo'd into that state and can correct it.
  if (parsed.data.confirm_url) return json({ ok: true })
  if (typeof parsed.data.t === 'number' && parsed.data.t < 2500) return json({ ok: true })
  if (company && !HAS_LETTERS.test(company)) {
    return json({ error: 'Please enter your company name.' }, 400)
  }

  if (!limiter.check(email)) return json({ error: 'Please try again shortly.' }, 429)

  const svc = createServiceClient()
  const { error } = await svc
    .from('signups')
    .insert({ email, company, website, source: parsed.data.source ?? null })

  // 23505 = unique violation → already signed up; treat as success (but don't
  // re-notify the owner about a duplicate).
  if (error && error.code === '23505') return json({ ok: true })
  if (error) {
    return json({ error: 'Something went wrong — please try again.' }, 500)
  }

  void notifyNewSignup(svc, email, website, company)
  return json({ ok: true })
}
