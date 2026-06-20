import { streamText, type ModelMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { previewChatSchema } from '@/lib/validation/schemas'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildMessages, type ChatMessage } from '@/lib/ai/prompt'
import { createRateLimiter } from '@/lib/ratelimit'

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
  const { botId, config, history, message } = parsed.data

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
  const retrieval = await retrieveContext(botId, message, {}, serviceRetrievalDeps(svc))

  if (retrieval.isWeak) {
    return new Response(config.fallbackMessage, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'x-weak': '1' },
    })
  }

  const messages = buildMessages(
    config,
    retrieval.chunks,
    history as ChatMessage[],
    message,
  ) as ModelMessage[]

  const result = streamText({
    model: openai(config.model || 'gpt-4o-mini'),
    messages,
    temperature: config.temperature ?? 0.3,
  })
  return result.toTextStreamResponse({
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
