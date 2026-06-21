import { type ModelMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceClient } from '@/lib/supabase/service'
import { chatRequestSchema } from '@/lib/validation/schemas'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildMessages, contentFor, defaultLanguage, type ChatMessage } from '@/lib/ai/prompt'
import { commerceEnabled, makeProductTools, ndjsonChatResponse, ndjsonText } from '@/lib/ai/commerce-tool'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot, Citation } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

export const maxDuration = 60

// ~30 messages/min per visitor per bot, small burst.
const limiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const body = await req.json().catch(() => null)
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)
  const { publicKey, visitorId, conversationId, message } = parsed.data

  const svc = createServiceClient()

  // Resolve the bot by public key.
  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', publicKey)
    .single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)

  // Active language: requested (if enabled) else the bot default.
  const lang =
    parsed.data.language && bot.config.languages?.includes(parsed.data.language)
      ? parsed.data.language
      : defaultLanguage(bot.config)

  // Origin allowlist + rate limit.
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(`${bot.id}:${visitorId}`)) {
    return json({ error: 'Rate limit exceeded' }, 429)
  }

  // Find or create the conversation.
  let convId = conversationId ?? null
  if (convId) {
    const { data: existing } = await svc
      .from('conversations')
      .select('id')
      .eq('id', convId)
      .eq('bot_id', bot.id)
      .single()
    if (!existing) convId = null
  }
  if (!convId) {
    const { data: created } = await svc
      .from('conversations')
      .insert({ bot_id: bot.id, visitor_id: visitorId })
      .select('id')
      .single()
    convId = created!.id as string
  }

  // Persist the user message; bump conversation activity.
  await svc.from('messages').insert({ conversation_id: convId, role: 'user', content: message })
  await svc.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)

  // Load recent history (excluding the just-inserted message handled by buildMessages tail).
  const { data: historyRows } = await svc
    .from('messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(40)
  const history: ChatMessage[] = (historyRows ?? [])
    .slice(0, -1) // drop the user message we just inserted; buildMessages adds it as the tail
    .map((m) => ({ role: m.role as ChatMessage['role'], content: m.content as string }))

  // Retrieve grounding context.
  const retrieval = await retrieveContext(bot.id, message, {}, serviceRetrievalDeps(svc))

  const commerce = commerceEnabled(bot.config)
  const baseHeaders = { ...cors, 'x-conversation-id': convId }

  // Weak retrieval with no product search → fallback + lead-capture signal.
  if (retrieval.isWeak && !commerce) {
    const fallback = contentFor(bot.config, lang).fallbackMessage
    await svc.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: fallback,
      citations: [],
    })
    const leadTrigger = bot.config.leadCapture?.enabled && bot.config.leadCapture.trigger === 'on_fallback'
    return ndjsonText(fallback, { ...baseHeaders, 'x-lead-capture': leadTrigger ? '1' : '0' })
  }

  const messages = buildMessages(bot.config, retrieval.chunks, history, message, lang) as ModelMessage[]
  const citations: Citation[] = retrieval.matched.map((m) => ({
    source_id: m.source_id,
    snippet: m.content.slice(0, 160),
  }))
  const productSink: CommerceProduct[] = []

  return ndjsonChatResponse(openai(bot.config.model || 'gpt-4o-mini'), messages, {
    temperature: bot.config.temperature ?? 0.3,
    headers: baseHeaders,
    tools: commerce ? makeProductTools(bot.config, productSink) : undefined,
    productSink,
    onText: async (text) => {
      await svc.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: text,
        citations,
      })
      await svc
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId)
    },
  })
}
