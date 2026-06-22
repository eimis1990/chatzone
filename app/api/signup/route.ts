/**
 * POST /api/signup
 *
 * Public early-access capture from the landing page. Stores the email (deduped),
 * rate-limited per email. Same-origin only (the landing form), so no CORS.
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { createRateLimiter } from '@/lib/ratelimit'

const limiter = createRateLimiter({ capacity: 3, refillPerSec: 0.05 })

const bodySchema = z.object({
  email: z.string().email().max(200),
  source: z.string().max(40).optional(),
})

export async function POST(req: Request) {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Enter a valid email.' }, 400)
  const email = parsed.data.email.trim().toLowerCase()

  if (!limiter.check(email)) return json({ error: 'Please try again shortly.' }, 429)

  const svc = createServiceClient()
  const { error } = await svc.from('signups').insert({ email, source: parsed.data.source ?? null })

  // 23505 = unique violation → already signed up; treat as success.
  if (error && error.code !== '23505') {
    return json({ error: 'Something went wrong — please try again.' }, 500)
  }
  return json({ ok: true })
}
