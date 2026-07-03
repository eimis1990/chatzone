import { NextResponse } from 'next/server'
import { getEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyElevenLabsSignature, transcriptToRows, type TranscriptTurn } from '@/lib/voice-webhook'
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
    .select('id')
    .eq('elevenlabs_agent_id', agentId)
    .single<Pick<Bot, 'id'>>()
  if (!bot) return NextResponse.json({ received: true }) // unknown agent — ack, don't retry

  // Idempotent: a retry with the same conversation_id is a no-op.
  const { data: existing } = await svc
    .from('conversations')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle()
  if (existing) return NextResponse.json({ received: true, deduped: true })

  const { rows, startedAt, lastAt } = transcriptToRows(turns, evt.event_timestamp)

  const { data: conv, error: convErr } = await svc
    .from('conversations')
    .insert({
      bot_id: bot.id,
      visitor_id: `voice-${externalId.slice(0, 8)}`,
      channel: 'voice',
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

  return NextResponse.json({ received: true, conversationId: conv.id })
}
