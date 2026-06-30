import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { previewTtsSchema } from '@/lib/validation/schemas'
import { synthesizeSpeech, ttsModelForLanguage, MissingVoiceKeyError } from '@/lib/ai/tts'
import { toSpeechText } from '@/lib/format-message'
import { createRateLimiter } from '@/lib/ratelimit'

export const maxDuration = 30
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })

// Authenticated test playground TTS: synthesizes arbitrary preview text with a
// chosen voice. Gated by the signed-in session (the client is testing).
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!limiter.check(user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const body = await req.json().catch(() => null)
  const parsed = previewTtsSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  try {
    const audio = await synthesizeSpeech(toSpeechText(parsed.data.text), parsed.data.voiceId, {
      model: ttsModelForLanguage(parsed.data.language ?? 'en'),
    })
    return new Response(audio, {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) {
      return NextResponse.json({ error: 'Voice unavailable' }, { status: 503 })
    }
    return NextResponse.json({ error: 'TTS failed' }, { status: 502 })
  }
}
