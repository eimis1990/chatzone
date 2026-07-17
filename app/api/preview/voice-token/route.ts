import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureAgent, getConversationToken } from '@/lib/ai/elevenlabs-agent'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import type { Bot } from '@/lib/types'

export const maxDuration = 30
const bodySchema = z.object({ botId: z.string().uuid(), language: z.enum(['en', 'lt']).optional() })

// Authenticated: mints a live-call conversation token for the test playground.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', parsed.data.botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', parsed.data.botId).single<Bot>()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!bot.config.voice?.enabled) {
    return NextResponse.json({ error: 'Voice not enabled' }, { status: 403 })
  }

  try {
    const agentId = await ensureAgent(svc, bot)
    const token = await getConversationToken(agentId)
    const voices = bot.config.voice?.voices ?? {}
    const lang = parsed.data.language ?? 'en'
    const voiceId = voices[lang] ?? voices.en
    return NextResponse.json({ token, agentId, voiceId })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) {
      return NextResponse.json({ error: 'Voice calling unavailable' }, { status: 503 })
    }
    console.error('[preview/voice-token] Failed to ensure agent or mint conversation token', err)
    return NextResponse.json({ error: 'Failed to start voice call' }, { status: 502 })
  }
}
