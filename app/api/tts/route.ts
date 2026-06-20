import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { synthesizeSpeech, ttsModelForLanguage, MissingVoiceKeyError } from '@/lib/ai/tts'
import type { Bot } from '@/lib/types'

export const maxDuration = 30

const ttsLimiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })

const bodySchema = z.object({
  publicKey: z.string().min(1),
  messageId: z.string().uuid(),
  language: z.enum(['en', 'lt']).optional(),
})

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)
  const { publicKey, messageId } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!bot.config.voice?.enabled || !bot.config.voice?.ttsEnabled) {
    return json({ error: 'Voice not enabled' }, 403)
  }
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!ttsLimiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  // Fetch the message and verify it belongs to this bot and is an assistant reply.
  const { data: msg } = await svc
    .from('messages')
    .select('content, role, conversation_id')
    .eq('id', messageId)
    .single<{ content: string; role: string; conversation_id: string }>()
  if (!msg || msg.role !== 'assistant') return json({ error: 'Message not found' }, 404)
  const { data: conv } = await svc
    .from('conversations')
    .select('bot_id')
    .eq('id', msg.conversation_id)
    .single<{ bot_id: string }>()
  if (!conv || conv.bot_id !== bot.id) return json({ error: 'Forbidden' }, 403)

  const lang =
    parsed.data.language && bot.config.languages?.includes(parsed.data.language)
      ? parsed.data.language
      : (bot.config.languages?.[0] ?? 'en')
  const voiceId = bot.config.voice.voices?.[lang] ?? bot.config.voice.voices?.en ?? ''

  try {
    const audio = await synthesizeSpeech(msg.content, voiceId, { model: ttsModelForLanguage(lang) })
    return new Response(audio, {
      headers: { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) return json({ error: 'Voice unavailable' }, 503)
    return json({ error: 'TTS failed' }, 502)
  }
}
