import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import {
  verifyElevenLabsSignature,
  transcriptToRows,
  callDurationSecs,
  callSource,
  type TranscriptTurn,
} from '@/lib/voice-webhook'
import { recordVoiceUsage, overageMinutesDelta, maybeSendVoiceUsageWarning, VOICE_INCLUDED_SECS } from '@/lib/voice-usage'
import { reportVoiceOverage } from '@/lib/stripe/voice-overage'
import type { Bot } from '@/lib/types'

// ElevenLabs post-call webhook: persists a voice call as a conversation +
// messages (channel = 'voice') so calls show up alongside chats in
// Conversations / Analytics. Configure a WORKSPACE-level post-call webhook in
// ElevenLabs → /api/widget/voice-webhook, and put its shared secret in
// ELEVENLABS_WEBHOOK_SECRET. One webhook covers every bot; data.agent_id routes
// each call back to its bot.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Transcripts can be long; give the handler room.
export const maxDuration = 60

export async function POST(req: Request) {
  const secret = getEnv().ELEVENLABS_WEBHOOK_SECRET
  // Fail closed: without a configured secret we cannot trust the payload.
  if (!secret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })

  const rawBody = await req.text()
  if (!verifyElevenLabsSignature(rawBody, req.headers.get('elevenlabs-signature'), secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let evt: { type?: string; event_timestamp?: number; data?: Record<string, unknown> }
  try {
    evt = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only post-call transcripts create conversations; ack anything else.
  if (evt.type !== 'post_call_transcription' || !evt.data) {
    return NextResponse.json({ received: true })
  }

  const data = evt.data
  const agentId = typeof data.agent_id === 'string' ? data.agent_id : ''
  const externalId = typeof data.conversation_id === 'string' ? data.conversation_id : ''
  const turns = Array.isArray(data.transcript) ? (data.transcript as TranscriptTurn[]) : []
  if (!agentId || !externalId) return NextResponse.json({ received: true })

  const svc = createServiceClient()

  // Map the ElevenLabs agent back to our bot.
  const { data: bot } = await svc
    .from('bots')
    .select('id, org_id')
    .eq('elevenlabs_agent_id', agentId)
    .single<Pick<Bot, 'id' | 'org_id'>>()
  if (!bot) return NextResponse.json({ received: true }) // unknown agent — ack, don't retry

  // Idempotent: a retry with the same conversation_id is a no-op.
  const { data: existing } = await svc
    .from('conversations')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()
  if (existing) return NextResponse.json({ received: true, deduped: true })

  const { rows, startedAt, lastAt } = transcriptToRows(turns, evt.event_timestamp)
  // Metering inputs: call length + whether this was a configurator preview
  // call (server-issued tag from /api/preview/voice-token) or a live one.
  const source = callSource(data as Parameters<typeof callSource>[0])
  const durationSecs = callDurationSecs(data as Parameters<typeof callDurationSecs>[0], turns)

  const { data: conv, error: convErr } = await svc
    .from('conversations')
    .insert({
      bot_id: bot.id,
      visitor_id: `voice-${externalId.slice(0, 8)}`,
      channel: 'voice',
      source,
      duration_secs: durationSecs,
      external_id: externalId,
      started_at: startedAt,
      last_message_at: lastAt,
      metadata: { elevenlabs_conversation_id: externalId, elevenlabs_agent_id: agentId },
    })
    .select('id')
    .single<{ id: string }>()

  // A concurrent retry may have inserted first (unique external_id) — treat as done.
  if (convErr || !conv) return NextResponse.json({ received: true })

  if (rows.length) {
    const { error: msgErr } = await svc.from('messages').insert(
      rows.map((m) => ({
        conversation_id: conv.id,
        role: m.role,
        content: m.content,
        citations: [],
        products: [],
        from_human: false,
        created_at: m.created_at,
      })),
    )
    if (msgErr) {
      // Roll back the empty conversation so a retry can re-create it cleanly.
      await svc.from('conversations').delete().eq('id', conv.id)
      return NextResponse.json({ error: 'Failed to store transcript' }, { status: 500 })
    }
  }

  // Metering: atomically add this call's seconds to the org's monthly counter.
  // If this fails we roll back the conversation and 500 — the ElevenLabs retry
  // recreates everything (external_id dedupe guarantees exactly-once usage).
  let usage: { beforeSecs: number; afterSecs: number }
  try {
    usage = await recordVoiceUsage(svc, bot.org_id, source, durationSecs)
  } catch (err) {
    console.error('[voice-webhook] usage recording failed:', err)
    await svc.from('messages').delete().eq('conversation_id', conv.id)
    await svc.from('conversations').delete().eq('id', conv.id)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }

  if (source === 'widget') {
    // Billing report is best-effort: usage is safely in voice_usage, so a
    // Stripe hiccup must not trigger a webhook retry (which would dedupe and
    // skip billing anyway). Reconcile from voice_usage if an event is lost.
    const overageMinutes = overageMinutesDelta(usage.beforeSecs, usage.afterSecs, VOICE_INCLUDED_SECS)
    if (overageMinutes > 0) {
      await reportVoiceOverage(bot.org_id, overageMinutes).catch((err) =>
        console.error('[voice-webhook] overage report failed:', err),
      )
    }
    await maybeSendVoiceUsageWarning(svc, bot.org_id, usage.afterSecs)
  }

  return NextResponse.json({ received: true, conversationId: conv.id })
}
