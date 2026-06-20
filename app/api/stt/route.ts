import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { transcribeAudio } from '@/lib/ai/stt'
import type { Bot } from '@/lib/types'

export const maxDuration = 30

const sttLimiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })
const MAX_AUDIO_BYTES = 10 * 1024 * 1024 // 10 MB

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'Expected multipart/form-data' }, 400)
  }
  const publicKey = form.get('publicKey')
  const audio = form.get('audio')
  if (typeof publicKey !== 'string' || !(audio instanceof Blob)) {
    return json({ error: 'Invalid request' }, 400)
  }
  if (audio.size > MAX_AUDIO_BYTES) return json({ error: 'Audio too large' }, 413)

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!bot.config.voice?.enabled || !bot.config.voice?.sttEnabled) {
    return json({ error: 'Voice not enabled' }, 403)
  }
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }
  if (!sttLimiter.check(bot.id)) return json({ error: 'Rate limit exceeded' }, 429)

  try {
    const text = await transcribeAudio(audio)
    return json({ text })
  } catch {
    return json({ error: 'Transcription failed' }, 502)
  }
}
