/**
 * POST /api/widget/order
 *
 * Public widget endpoint for the voice `order_status` client tool. Looks up an
 * order gated by order id + a matching billing email; returns a spoken summary
 * and (only when matched) the order for the on-screen card. No order data leaks
 * on a mismatch. Origin-checked + tightly rate-limited (anti-brute-force).
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { getOrderStatus, summarizeOrder } from '@/lib/commerce'
import type { Bot } from '@/lib/types'

// Tight: order lookups are identity-gated; cap attempts per bot.
const limiter = createRateLimiter({ capacity: 6, refillPerSec: 0.2 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  orderId: z.string().min(1).max(64),
  email: z.string().min(3).max(200),
})

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
  const { publicKey, orderId, email } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, status, config')
    .eq('public_key', publicKey)
    .single<Pick<Bot, 'id' | 'status' | 'config'>>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(`${bot.id}:order`)) return json({ error: 'Rate limit exceeded' }, 429)

  const order = await getOrderStatus(bot.config.commerce, { orderId, email })
  return json({ found: order.found, order: order.found ? order : undefined, summary: summarizeOrder(order) })
}
