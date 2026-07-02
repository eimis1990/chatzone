import { type ModelMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServiceClient } from '@/lib/supabase/service'
import { chatRequestSchema } from '@/lib/validation/schemas'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildMessages, contentFor, defaultLanguage, type ChatMessage } from '@/lib/ai/prompt'
import { commerceEnabled, makeProductTools, ndjsonChatResponse, ndjsonText } from '@/lib/ai/commerce-tool'
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'
import { rewriteQuery } from '@/lib/ai/query-rewrite'
import { searchCatalog } from '@/lib/products/search'
import { createRateLimiter } from '@/lib/ratelimit'
import { detectHandoffIntent, HANDOFF_ACK } from '@/lib/handoff'
import { notifyHandoffRequested } from '@/lib/notify'
import { isOverConversationLimit, maybeSendUsageWarning } from '@/lib/usage'
import type { Bot, BotLanguage, Citation, HandoffStatus } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'

export const maxDuration = 60

// ~30 messages/min per visitor per bot, small burst.
const limiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })

// Shown when the org has used up its monthly conversation allowance (hard block).
const OFFLINE_MESSAGE: Record<BotLanguage, string> = {
  en: 'Our assistant is offline right now. Please reach out through our other contact channels and we’ll get back to you.',
  lt: 'Mūsų asistentas šiuo metu nepasiekiamas. Susisiekite kitais būdais ir mes jums atsakysime.',
}

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

  // Find or create the conversation, carrying its handoff state.
  let convId = conversationId ?? null
  let handoffStatus: HandoffStatus = 'bot'
  let priorHadFallback = false
  if (convId) {
    const { data: existing } = await svc
      .from('conversations')
      .select('id, handoff_status, had_fallback')
      .eq('id', convId)
      .eq('bot_id', bot.id)
      .single<{ id: string; handoff_status: HandoffStatus | null; had_fallback: boolean | null }>()
    if (!existing) convId = null
    else {
      handoffStatus = existing.handoff_status ?? 'bot'
      priorHadFallback = Boolean(existing.had_fallback)
    }
  }
  if (!convId) {
    // Hard block: once the org is over its monthly conversation pool, new
    // conversations get an offline message and the model is never called.
    if (await isOverConversationLimit(svc, bot.org_id)) {
      return ndjsonText(OFFLINE_MESSAGE[lang] ?? OFFLINE_MESSAGE.en, { ...cors })
    }
    const { data: created } = await svc
      .from('conversations')
      .insert({ bot_id: bot.id, visitor_id: visitorId })
      .select('id')
      .single()
    convId = created!.id as string
    // One admin nudge per month when the org crosses 80% of its allowance.
    void maybeSendUsageWarning(svc, bot.org_id)
  }

  // Persist the user message; bump conversation activity.
  await svc.from('messages').insert({ conversation_id: convId, role: 'user', content: message })
  await svc.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)

  const handoffHeaders = { ...cors, 'x-conversation-id': convId }

  // A human is queued (`requested`) or actively handling (`live`): record the
  // visitor turn but do NOT auto-reply — the agent answers from the inbox.
  if (handoffStatus === 'requested' || handoffStatus === 'live') {
    return new Response('', { status: 200, headers: { ...handoffHeaders, 'x-handoff': handoffStatus } })
  }

  // A resolved handoff episode is over; the bot resumes for this new turn.
  if (handoffStatus === 'resolved') {
    await svc.from('conversations').update({ handoff_status: 'bot' }).eq('id', convId)
  }

  // The visitor explicitly asks for a human → escalate + acknowledge (no LLM).
  // Checked in EVERY enabled language, not just the active one — visitors type
  // Lithuanian on the English tab (and vice versa) all the time.
  const handoffLangs = bot.config.languages?.length ? bot.config.languages : [lang]
  if (handoffLangs.some((l) => detectHandoffIntent(message, l))) {
    await svc
      .from('conversations')
      .update({ handoff_status: 'requested', handoff_requested_at: new Date().toISOString() })
      .eq('id', convId)
    void notifyHandoffRequested(svc, bot, message)
    const ack = HANDOFF_ACK[lang] ?? HANDOFF_ACK.en
    await svc
      .from('messages')
      .insert({ conversation_id: convId, role: 'assistant', content: ack, citations: [] })
    return ndjsonText(ack, { ...handoffHeaders, 'x-handoff': 'requested' })
  }

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

  // Retrieve grounding context; on a miss, retry once with a condensed standalone
  // query (visitors write elliptical follow-ups like "o kiek kainuoja?" that
  // embed poorly on their own).
  let retrieval = await retrieveContext(bot.id, message, {}, serviceRetrievalDeps(svc))
  if (retrieval.isWeak) {
    const rewritten = await rewriteQuery(message, history)
    if (rewritten) {
      const retry = await retrieveContext(bot.id, rewritten, {}, serviceRetrievalDeps(svc))
      if (!retry.isWeak) retrieval = retry
    }
  }

  const commerce = commerceEnabled(bot.config)
  const baseHeaders = { ...handoffHeaders, 'x-handoff': 'bot' }

  // Weak retrieval with no product search → fallback + lead-capture signal.
  if (retrieval.isWeak && !commerce) {
    const fallback = contentFor(bot.config, lang).fallbackMessage
    await svc.from('messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: fallback,
      citations: [],
    })
    // Flag the conversation as having hit the fallback (AI-accuracy proxy).
    await svc.from('conversations').update({ had_fallback: true }).eq('id', convId)

    // A repeat fallback means the bot is stuck — escalate to a human.
    let handoff = 'bot'
    if (priorHadFallback) {
      await svc
        .from('conversations')
        .update({ handoff_status: 'requested', handoff_requested_at: new Date().toISOString() })
        .eq('id', convId)
      handoff = 'requested'
      void notifyHandoffRequested(svc, bot, message)
    }
    const leadTrigger = bot.config.leadCapture?.enabled && bot.config.leadCapture.trigger === 'on_fallback'
    return ndjsonText(fallback, {
      ...baseHeaders,
      'x-lead-capture': leadTrigger ? '1' : '0',
      'x-handoff': handoff,
    })
  }

  const messages = buildMessages(bot.config, retrieval.chunks, history, message, lang) as ModelMessage[]
  const citations: Citation[] = retrieval.matched.map((m) => ({
    source_id: m.source_id,
    snippet: m.content.slice(0, 160),
  }))
  const productSink: CommerceProduct[] = []
  const orderSink: OrderStatus[] = []
  // Shared with makeProductTools so the response layer can auto-render a lone
  // found product when the model forgets to call display_products.
  const candidates = new Map<string, CommerceProduct>()

  return ndjsonChatResponse(openai(bot.config.model || DEFAULT_CHAT_MODEL), messages, {
    temperature: bot.config.temperature ?? DEFAULT_TEMPERATURE,
    headers: baseHeaders,
    tools: commerce
      ? makeProductTools(
          bot.config,
          productSink,
          orderSink,
          (p) => searchCatalog(bot, p.query, svc, p.limit ?? 24, { audience: p.audience }),
          candidates,
        )
      : undefined,
    productSink,
    orderSink,
    candidates,
    errorText: contentFor(bot.config, lang).fallbackMessage,
    onText: async (text) => {
      await svc.from('messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: text,
        citations,
        // Persist the products the bot surfaced this turn so the transcript can
        // replay the full interaction. productSink is final by onText time.
        products: productSink,
      })
      await svc
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId)
    },
  })
}
