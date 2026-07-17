import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { entitlementsFor } from '@/lib/entitlements'
import { transcribeAudio, MAX_AUDIO_BYTES } from '@/lib/ai/transcribe'
import type { Plan } from '@/lib/types'

export const maxDuration = 30

// Authenticated Whisper dictation for the configurator preview — same plan
// gate as the live widget so the playground never over-promises.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const botId = String(form.get('botId') ?? '')
  const language = String(form.get('language') ?? '') || undefined
  const audio = form.get('audio')
  if (!botId || !(audio instanceof File)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (audio.size === 0 || audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Audio too large' }, { status: 413 })
  }

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id, org_id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', owned.org_id)
    .single<{ plan: Plan | null }>()
  if (!entitlementsFor(org?.plan ?? 'free').dictation) {
    return NextResponse.json({ error: 'Dictation is not available on this plan' }, { status: 403 })
  }

  try {
    const text = await transcribeAudio(audio, language)
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[dictation] preview transcription failed:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
  }
}
