/**
 * POST /api/widget/poll
 *
 * Public widget endpoint. While a conversation is in handoff (`requested` /
 * `live`), the unauthenticated widget polls this (~every 4s) for the current
 * handoff status, the assigned agent's name, and any new human-agent replies.
 *
 * Body: { publicKey, conversationId, afterTs? }
 *   afterTs - ISO timestamp of the newest message the widget already has; only
 *             messages created strictly after it are returned.
 *
 * Response: { status, agentName, serverTime, messages: [...] }
 *
 * Security: scoped by public_key + conversation_id (no auth, like /api/chat);
 * origin-checked and rate-limited.
 */
import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot, HandoffStatus } from '@/lib/types'

// Generous: ~1 poll / 4s per conversation, with burst.
const limiter = createRateLimiter({ capacity: 8, refillPerSec: 0.4 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid(),
  afterTs: z.string().datetime().optional(),
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
  const { publicKey, conversationId, afterTs } = parsed.data

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
    .select('id, handoff_status, assigned_to')
    .eq('id', conversationId)
    .eq('bot_id', bot.id)
    .single<{ id: string; handoff_status: HandoffStatus | null; assigned_to: string | null }>()
  if (!conv) return json({ error: 'Conversation not found' }, 404)

  // Resolve the assigned agent's display name (best-effort).
  let agentName: string | null = null
  if (conv.assigned_to) {
    const { data: agent } = await svc
      .from('profiles')
      .select('full_name')
      .eq('id', conv.assigned_to)
      .single<{ full_name: string | null }>()
    agentName = agent?.full_name ?? null
  }

  // New human-agent replies since the widget's last-seen timestamp.
  let q = svc
    .from('messages')
    .select('id, role, content, created_at, from_human')
    .eq('conversation_id', conversationId)
    .eq('from_human', true)
    .order('created_at', { ascending: true })
    .limit(50)
  if (afterTs) q = q.gt('created_at', afterTs)
  const { data: rows } = await q

  return json({
    status: conv.handoff_status ?? 'bot',
    agentName,
    serverTime: new Date().toISOString(),
    messages: (rows ?? []).map((m) => ({
      id: m.id as string,
      role: m.role as string,
      content: m.content as string,
      created_at: m.created_at as string,
      from_human: true,
    })),
  })
}
