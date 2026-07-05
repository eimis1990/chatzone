import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot } from '@/lib/types'

// Widget interaction events (product/link/suggested-question clicks, opens).
// Fire-and-forget analytics from the widget: public + scoped by public_key,
// same trust posture as /api/feedback. Inserts go through the service role;
// org members read the rows via RLS in the analytics views.
const limiter = createRateLimiter({ capacity: 30, refillPerSec: 2 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional(),
  type: z.enum(['product_click', 'link_click', 'suggested_question_click', 'widget_open']),
  payload: z
    .object({
      productId: z.string().max(200).optional(),
      title: z.string().max(300).optional(),
      price: z.string().max(50).optional(),
      url: z.string().max(2000).optional(),
      kind: z.enum(['answer', 'action']).optional(),
      question: z.string().max(500).optional(),
      mode: z.string().max(30).optional(),
    })
    .default({}),
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
  const { publicKey, conversationId, messageId, type, payload } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('id, config').eq('public_key', publicKey).single<Bot>()
  if (!bot) return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  // A provided conversation must belong to this bot (prevents cross-bot rows).
  if (conversationId) {
    const { data: conv } = await svc
      .from('conversations')
      .select('id, bot_id')
      .eq('id', conversationId)
      .single<{ id: string; bot_id: string }>()
    if (!conv || conv.bot_id !== bot.id) return json({ error: 'Not found' }, 404)
  }

  const { error } = await svc.from('widget_events').insert({
    bot_id: bot.id,
    conversation_id: conversationId ?? null,
    // Local (unsynced) widget message ids aren't UUIDs and never reach here;
    // a stale-but-valid UUID that no longer exists just fails the FK.
    message_id: messageId ?? null,
    type,
    payload,
  })
  if (error) return json({ error: 'Invalid request' }, 400)
  return json({ ok: true })
}
