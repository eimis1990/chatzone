import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { ensureAgent, getConversationToken } from '@/lib/ai/elevenlabs-agent'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { isOverConversationLimit } from '@/lib/usage'
import type { Bot } from '@/lib/types'

export const maxDuration = 30
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 })
const bodySchema = z.object({
  publicKey: z.string().min(1),
  language: z.enum(['en', 'lt']).optional(),
})

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
  // Voice is a paid add-on — reject calls when the org doesn't have it active.
  const { data: org } = await svc
    .from('organizations')
    .select('voice_addon')
    .eq('id', bot.org_id)
    .single<{ voice_addon: boolean | null }>()
  if (!org?.voice_addon) return json({ error: 'Voice add-on not active' }, 403)
  // Hard block: no calls once the org is over its monthly conversation pool.
  if (await isOverConversationLimit(svc, bot.org_id)) {
    return json({ error: 'Agent offline — monthly limit reached' }, 403)
  }
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!limiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  try {
    const agentId = await ensureAgent(svc, bot)
    const token = await getConversationToken(agentId)
    // Voice for the requested language (overrides the call's voice client-side).
    const voices = bot.config.voice?.voices ?? {}
    const lang = parsed.data.language ?? 'en'
    const voiceId = voices[lang] ?? voices.en
    return json({ token, agentId, voiceId })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) return json({ error: 'Voice calling unavailable' }, 503)
    return json({ error: 'Failed to start voice call' }, 502)
  }
}
