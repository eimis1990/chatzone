import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { entitlementsFor } from '@/lib/entitlements'
import { transcribeAudio, MAX_AUDIO_BYTES } from '@/lib/ai/transcribe'
import type { Bot, Plan } from '@/lib/types'

export const maxDuration = 30

// Whisper dictation for the widget composer. Plan-gated (paid tiers) and
// rate-limited harder than search — audio transcription costs real money.
const limiter = createRateLimiter({ capacity: 6, refillPerSec: 0.2 })

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const form = await req.formData().catch(() => null)
  if (!form) return json({ error: 'Invalid request' }, 400)
  const publicKey = String(form.get('publicKey') ?? '')
  const language = String(form.get('language') ?? '') || undefined
  const audio = form.get('audio')
  if (!publicKey || !(audio instanceof File)) return json({ error: 'Invalid request' }, 400)
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) return json({ error: 'Audio too large' }, 413)

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  // Plan gate — dictation is a paid-tier feature (also hidden client-side).
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', bot.org_id)
    .single<{ plan: Plan | null }>()
  if (!entitlementsFor(org?.plan ?? 'free').dictation) {
    return json({ error: 'Dictation is not available on this plan' }, 403)
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!limiter.check(`${bot.id}:${ip}`)) return json({ error: 'Too many requests' }, 429)

  try {
    const text = await transcribeAudio(audio, language)
    return json({ text })
  } catch (err) {
    console.error('[dictation] transcription failed:', err)
    return json({ error: 'Transcription failed' }, 502)
  }
}
