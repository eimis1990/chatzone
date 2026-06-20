/**
 * GET /api/messages
 *
 * Public widget endpoint: returns recent messages for a conversation so the
 * embed UI can obtain assistant message ids for the TTS play button.
 *
 * Query params:
 *   publicKey      - bot's public key
 *   conversationId - UUID of the conversation
 *
 * Response: { messages: { id, role, content }[] }
 *
 * Security:
 *   - Origin checked against bot's allowedDomains.
 *   - Conversation must belong to the bot identified by publicKey.
 *   - Returns only the 20 most-recent messages (enough for the widget).
 *   - No auth required (widget context).
 */
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import type { Bot } from '@/lib/types'

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  })
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const { searchParams } = new URL(req.url)
  const publicKey = searchParams.get('publicKey')
  const conversationId = searchParams.get('conversationId')

  if (!publicKey || !conversationId) {
    return json({ error: 'Missing publicKey or conversationId' }, 400)
  }

  // Basic UUID format check.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(conversationId)) {
    return json({ error: 'Invalid conversationId' }, 400)
  }

  const svc = createServiceClient()

  // Resolve the bot and check origin.
  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', publicKey)
    .single<Bot>()

  if (!bot || bot.status !== 'active') {
    return json({ error: 'Bot not available' }, 404)
  }

  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  // Verify the conversation belongs to this bot.
  const { data: conv } = await svc
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('bot_id', bot.id)
    .single()

  if (!conv) {
    return json({ error: 'Conversation not found' }, 404)
  }

  // Return the 20 most recent messages (enough for TTS id lookup).
  const { data: rows, error } = await svc
    .from('messages')
    .select('id, role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return json({ error: 'Failed to fetch messages' }, 500)
  }

  // Re-sort ascending so the UI gets them in chronological order.
  const messages = (rows ?? []).reverse().map((m) => ({
    id: m.id as string,
    role: m.role as string,
    content: m.content as string,
  }))

  return json({ messages })
}
