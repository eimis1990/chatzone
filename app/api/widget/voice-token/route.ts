import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { getEnv } from '@/lib/env'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { ensureAgent, getConversationToken } from '@/lib/ai/elevenlabs-agent'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import type { Bot } from '@/lib/types'

export const maxDuration = 30
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 })
const bodySchema = z.object({ publicKey: z.string().min(1) })

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

// Public: mints a live-call conversation token for the embedded widget.
export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', parsed.data.publicKey)
    .single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!bot.config.voice?.enabled) return json({ error: 'Voice not enabled' }, 403)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  try {
    const agentId = await ensureAgent(svc, bot, getEnv().NEXT_PUBLIC_APP_URL)
    const token = await getConversationToken(agentId)
    return json({ token, agentId })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) return json({ error: 'Voice calling unavailable' }, 503)
    return json({ error: 'Failed to start voice call' }, 502)
  }
}
