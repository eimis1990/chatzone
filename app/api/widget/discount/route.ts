/**
 * POST /api/widget/discount
 *
 * Public widget endpoint for the voice `discount_code` client tool. Returns the
 * bot's configured discount (the code is not in the public widget config, so the
 * browser must fetch it here). Origin-checked + rate-limited.
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { getDiscount, summarizeDiscount } from '@/lib/commerce'
import type { Bot } from '@/lib/types'

const limiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })

const bodySchema = z.object({ publicKey: z.string().min(1) })

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, status, config')
    .eq('public_key', parsed.data.publicKey)
    .single<Pick<Bot, 'id' | 'status' | 'config'>>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(`${bot.id}:discount`)) return json({ error: 'Rate limit exceeded' }, 429)

  const d = getDiscount(bot.config.commerce)
  return json({ available: d.enabled, code: d.code, description: d.description, summary: summarizeDiscount(d) })
}
