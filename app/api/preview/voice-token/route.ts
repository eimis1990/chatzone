import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ensureAgent, getConversationToken } from '@/lib/ai/elevenlabs-agent'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { createRateLimiter } from '@/lib/ratelimit'
import { isInternalOrg } from '@/lib/entitlements'
import { voiceUsageThisMonth, PREVIEW_VOICE_INCLUDED_SECS } from '@/lib/voice-usage'
import type { Bot } from '@/lib/types'

export const maxDuration = 30
const limiter = createRateLimiter({ capacity: 5, refillPerSec: 0.2 }) // matches the widget route
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
  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', parsed.data.botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', parsed.data.botId).single<Bot>()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!bot.config.voice?.enabled) {
    return NextResponse.json({ error: 'Voice not enabled' }, { status: 403 })
  }

  // Preview minutes are free but only for orgs actually paying for voice, and
  // capped per month — every ElevenLabs second costs real money. Internal orgs
  // (owner chatbot + demo bots) bypass both gates, same as the widget route.
  const { data: org } = await svc
    .from('organizations')
    .select('voice_addon, is_demo, is_platform')
    .eq('id', bot.org_id)
    .single<{ voice_addon: boolean | null; is_demo: boolean | null; is_platform: boolean | null }>()
  if (!isInternalOrg(org)) {
    if (!org?.voice_addon) {
      return NextResponse.json(
        {
          error: 'Voice is a paid add-on — activate it on the Subscription page to test calls.',
          code: 'voice_addon_required',
        },
        { status: 403 },
      )
    }
    const { previewSecs } = await voiceUsageThisMonth(svc, bot.org_id)
    if (previewSecs >= PREVIEW_VOICE_INCLUDED_SECS) {
      return NextResponse.json(
        {
          error: 'Monthly preview call minutes are used up — they reset on the 1st.',
          code: 'preview_voice_limit',
        },
        { status: 403 },
      )
    }
  }

  try {
    const agentId = await ensureAgent(svc, bot)
    const token = await getConversationToken(agentId)
    const voices = bot.config.voice?.voices ?? {}
    const lang = parsed.data.language ?? 'en'
    const voiceId = voices[lang] ?? voices.en
    // call_source rides to ElevenLabs as a dynamic variable and comes back in
    // the post-call webhook — that's how preview minutes are metered apart.
    return NextResponse.json({ token, agentId, voiceId, dynamicVariables: { call_source: 'preview' } })
  } catch (err) {
    if (err instanceof MissingVoiceKeyError) {
      return NextResponse.json({ error: 'Voice calling unavailable' }, { status: 503 })
    }
    console.error('[preview/voice-token] Failed to ensure agent or mint conversation token', err)
    return NextResponse.json({ error: 'Failed to start voice call' }, { status: 502 })
  }
}
