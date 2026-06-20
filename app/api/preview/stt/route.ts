import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/ai/stt'
import { createRateLimiter } from '@/lib/ratelimit'

export const maxDuration = 30
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })
const MAX_AUDIO_BYTES = 10 * 1024 * 1024

// Authenticated test playground STT.
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!limiter.check(user.id)) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
  }
  const audio = form.get('audio')
  if (!(audio instanceof Blob)) return NextResponse.json({ error: 'Missing audio' }, { status: 400 })
  if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: 'Audio too large' }, { status: 413 })

  try {
    const text = await transcribeAudio(audio)
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
  }
}
