import { type ModelMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { previewChatSchema } from '@/lib/validation/schemas'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildMessages, contentFor, defaultLanguage, type ChatMessage } from '@/lib/ai/prompt'
import { commerceEnabled, makeProductTools, ndjsonChatResponse, ndjsonText } from '@/lib/ai/commerce-tool'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'
import { createRateLimiter } from '@/lib/ratelimit'
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'

export const maxDuration = 60

// Authenticated test playground: chat against the bot's KB using the CURRENT
// (possibly unsaved) config. Ephemeral — nothing is persisted.
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })

export async function POST(req: Request) {
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const body = await req.json().catch(() => null)
  const parsed = previewChatSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)
  const { botId, history, message } = parsed.data
  const config = parsed.data.config as BotConfig
  const lang =
    parsed.data.language && config.languages?.includes(parsed.data.language)
      ? parsed.data.language
      : defaultLanguage(config)

  // Auth + ownership (RLS: the bot is only visible if it's in the user's org).
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return json({ error: 'Unauthorized' }, 401)
  if (!limiter.check(user.id)) return json({ error: 'Rate limit exceeded' }, 429)

  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) return json({ error: 'Bot not found' }, 404)

  const svc = createServiceClient()
  const commerce = commerceEnabled(config)
  const retrieval = await retrieveContext(botId, message, {}, serviceRetrievalDeps(svc))

  if (retrieval.isWeak && !commerce) {
    return ndjsonText(contentFor(config, lang).fallbackMessage, { 'x-weak': '1' })
  }

  const messages = buildMessages(
    config,
    retrieval.chunks,
    history as ChatMessage[],
    message,
    lang,
  ) as ModelMessage[]
  const productSink: CommerceProduct[] = []
  const orderSink: OrderStatus[] = []
  const candidates = new Map<string, CommerceProduct>()

  return ndjsonChatResponse(openai(config.model || DEFAULT_CHAT_MODEL), messages, {
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    headers: {},
    tools: commerce
      ? makeProductTools(config, productSink, orderSink, undefined, candidates)
      : undefined,
    productSink,
    orderSink,
    candidates,
  })
}
