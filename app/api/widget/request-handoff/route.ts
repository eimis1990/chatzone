/**
 * POST /api/widget/request-handoff
 *
 * Public widget endpoint. The visitor taps "Talk to a person" → the
 * conversation moves to `requested` so it surfaces in the agent inbox and the
 * bot stops auto-replying. No-op if a human is already handling (`live`).
 *
 * Body: { publicKey, conversationId }
 * Response: { status }
 *
 * Security: scoped by public_key + conversation_id; origin-checked + rate-limited.
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot, HandoffStatus } from '@/lib/types'

const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid(),
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
  const { publicKey, conversationId } = parsed.data

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
  if (!limiter.check(`${bot.id}:${conversationId}`)) {
    return json({ error: 'Rate limit exceeded' }, 429)
  }

  const { data: conv } = await svc
    .from('conversations')
    .select('id, handoff_status')
    .eq('id', conversationId)
    .eq('bot_id', bot.id)
    .single<{ id: string; handoff_status: HandoffStatus | null }>()
  if (!conv) return json({ error: 'Conversation not found' }, 404)

  const current = conv.handoff_status ?? 'bot'
  // A live agent stays in control; otherwise queue the request.
  if (current === 'live') return json({ status: 'live' })

  await svc
    .from('conversations')
    .update({ handoff_status: 'requested', handoff_requested_at: new Date().toISOString() })
    .eq('id', conversationId)
  return json({ status: 'requested' })
}
