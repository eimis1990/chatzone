import { createServiceClient } from '@/lib/supabase/service'
import { getEnv } from '@/lib/env'
import { getLlmToken } from '@/lib/ai/elevenlabs-agent'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import type { Bot } from '@/lib/types'

export const maxDuration = 60

/**
 * OpenAI chat/completions-compatible endpoint that ElevenLabs Agents call as a
 * "custom LLM". It runs our RAG over the bot's knowledge base, then proxies an
 * OpenAI streaming completion (SSE) back in the exact format the agent expects.
 *
 * Auth: Bearer <shared token> (the same token stored as an ElevenLabs secret).
 */
export async function POST(req: Request, ctx: { params: Promise<{ publicKey: string }> }) {
  const { publicKey } = await ctx.params
  const svc = createServiceClient()

  // Verify the shared bearer token.
  const auth = req.headers.get('authorization') ?? ''
  const presented = auth.replace(/^Bearer\s+/i, '')
  const expected = await getLlmToken(svc)
  if (!expected || presented !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | { messages?: Array<{ role: string; content: string }> }
    | null
  if (!body?.messages?.length) {
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 })
  }

  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Bot not available' }), { status: 404 })
  }

  // RAG on the latest user turn.
  const lastUser = [...body.messages].reverse().find((m) => m.role === 'user')?.content ?? ''
  const retrieval = await retrieveContext(bot.id, lastUser, {}, serviceRetrievalDeps(svc))
  const system = buildSystemPrompt(bot.config, retrieval.chunks)

  // Rebuild messages: our grounding system + the agent's non-system turns.
  const turns = body.messages.filter((m) => m.role !== 'system')
  const messages = [{ role: 'system', content: system }, ...turns]

  // Proxy a streaming OpenAI completion straight back (already OpenAI SSE format).
  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getEnv().OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: bot.config.model || 'gpt-4o-mini',
      temperature: bot.config.temperature ?? 0.3,
      stream: true,
      messages,
    }),
  })

  if (!openaiRes.ok || !openaiRes.body) {
    return new Response(JSON.stringify({ error: 'LLM upstream error' }), { status: 502 })
  }

  return new Response(openaiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  })
}
