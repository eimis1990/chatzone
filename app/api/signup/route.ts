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
})

export async function POST(req: Request) {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Enter a valid email.' }, 400)
  const email = parsed.data.email.trim().toLowerCase()
  const company = parsed.data.company?.trim() || null
  const website = parsed.data.website?.trim() || null

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
