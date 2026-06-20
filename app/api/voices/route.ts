import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { listVoices } from '@/lib/ai/voices'
import { MissingVoiceKeyError } from '@/lib/ai/tts'

// Authenticated: lists ElevenLabs voices for the configurator picker.
export async function GET() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const voices = await listVoices()
    return NextResponse.json({ voices })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) {
      return NextResponse.json({ error: 'Voice unavailable', voices: [] }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to list voices' }, { status: 502 })
  }
}
