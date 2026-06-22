import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot } from '@/lib/types'

// Visitor thumbs up/down on a bot reply. Public + scoped by public_key.
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  messageId: z.string().uuid(),
  value: z.enum(['up', 'down']).nullable(),
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
  const { publicKey, messageId, value } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('id, config').eq('public_key', publicKey).single<Bot>()
  if (!bot) return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  // The message must be an assistant reply belonging to a conversation of this bot.
  const { data: msg } = await svc
    .from('messages')
    .select('id, role, conversations!inner(bot_id)')
    .eq('id', messageId)
    .single<{ id: string; role: string; conversations: { bot_id: string } }>()
  if (!msg || msg.role !== 'assistant' || msg.conversations?.bot_id !== bot.id) {
    return json({ error: 'Not found' }, 404)
  }

  await svc.from('messages').update({ feedback: value }).eq('id', messageId)
  return json({ ok: true })
}
