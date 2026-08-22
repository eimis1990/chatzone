import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'
import { createServiceClient } from '@/lib/supabase/service'
import {
  verifyHandshake,
  isValidSignature,
  extractTextMessages,
  sendTextMessage,
  type InboundTextMessage,
} from '@/lib/channels/meta'
import { processChannelMessage } from '@/lib/channels/processor'
import { connectionPageToken } from '@/lib/channels/outbound'
import { isOverConversationLimit } from '@/lib/usage'
import type { Bot, ChannelConnection, HandoffStatus } from '@/lib/types'

// Signature verification needs the raw body + Node crypto.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Retrieval + model call happen inside the request (Meta tolerates slow 200s
// better than errors; a queue-based async pipeline is a later step).
export const maxDuration = 60

/** Meta's one-time webhook verification handshake. */
export function GET(req: NextRequest) {
  const challenge = verifyHandshake(
    req.nextUrl.searchParams,
    getEnv().META_WEBHOOK_VERIFY_TOKEN,
  )
  if (!challenge) return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
  return new NextResponse(challenge, { status: 200 })
}

export async function POST(req: NextRequest) {
  const env = getEnv()
  const rawBody = await req.text()
  if (!isValidSignature(rawBody, req.headers.get('x-hub-signature-256'), env.META_APP_SECRET)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const svc = createServiceClient()
  for (const msg of extractTextMessages(payload)) {
    try {
      await handleInbound(svc, msg)
    } catch (err) {
      // Ack Meta regardless — redelivery of the whole batch would double-work
      // the messages that DID succeed. The event row records the failure.
      const summary = err instanceof Error ? err.message.slice(0, 300) : 'unknown'
      console.error('[meta-webhook] processing failed:', summary)
      await svc
        .from('channel_webhook_events')
        .update({ status: 'failed', error_summary: summary, processed_at: new Date().toISOString() })
        .eq('provider', msg.provider)
        .eq('event_id', msg.messageId)
    }
  }

  return NextResponse.json({ received: true })
}

async function handleInbound(svc: SupabaseClient, msg: InboundTextMessage) {
  // Idempotency: the message id is the event id; a duplicate delivery hits the
  // unique constraint and is skipped without reprocessing.
  const { error: insertErr } = await svc
    .from('channel_webhook_events')
    .insert({ provider: msg.provider, event_id: msg.messageId })
  if (insertErr) {
    if (insertErr.code === '23505') return // duplicate delivery
    throw new Error(`event insert failed: ${insertErr.message}`)
  }
  const finish = (status: 'processed' | 'skipped', connectionId?: string, note?: string) =>
    svc
      .from('channel_webhook_events')
      .update({
        status,
        channel_connection_id: connectionId ?? null,
        error_summary: note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq('provider', msg.provider)
      .eq('event_id', msg.messageId)

  // Resolve the Page / Instagram account to an active connection + its bot.
  const { data: connection } = await svc
    .from('channel_connections')
    .select('id, org_id, bot_id, provider, external_account_id, display_name, status')
    .eq('provider', msg.provider)
    .eq('external_account_id', msg.accountId)
    .eq('status', 'active')
    .maybeSingle<ChannelConnection>()
  if (!connection) {
    // Keep the unmatched account id — it's the diagnostic for "why didn't my
    // channel answer" and the easiest way to learn a new account's id.
    await finish('skipped', undefined, `no active connection for ${msg.provider}:${msg.accountId}`)
    return
  }
  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('id', connection.bot_id)
    .single<Bot>()
  if (!bot || bot.status !== 'active') {
    await finish('skipped', connection.id)
    return
  }

  // Track the contact (PSID is connection-scoped).
  await svc.from('channel_contacts').upsert(
    {
      channel_connection_id: connection.id,
      external_user_id: msg.senderId,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'channel_connection_id,external_user_id' },
  )

  // Find or create the conversation for this (connection, PSID).
  const { data: existing } = await svc
    .from('conversations')
    .select('id, handoff_status')
    .eq('bot_id', bot.id)
    .eq('channel_connection_id', connection.id)
    .eq('visitor_id', msg.senderId)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; handoff_status: HandoffStatus | null }>()
  let convId = existing?.id ?? null
  if (!convId) {
    // Over the monthly pool → don't create a conversation or call the model.
    if (await isOverConversationLimit(svc, bot.org_id)) {
      await finish('skipped', connection.id)
      return
    }
    const { data: created, error: convErr } = await svc
      .from('conversations')
      .insert({
        bot_id: bot.id,
        visitor_id: msg.senderId,
        channel: msg.provider,
        channel_connection_id: connection.id,
      })
      .select('id')
      .single()
    if (convErr || !created) throw new Error(`conversation create failed: ${convErr?.message}`)
    convId = created.id as string
  }

  // Persist the inbound turn before any AI work.
  await svc.from('messages').insert({ conversation_id: convId, role: 'user', content: msg.text })
  await svc
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', convId)

  // Human takeover: record the turn, never auto-reply over the human.
  const handoff = existing?.handoff_status
  if (handoff === 'requested' || handoff === 'live') {
    await finish('processed', connection.id)
    return
  }
  // A resolved handoff episode is over; the bot resumes for this new turn.
  if (handoff === 'resolved') {
    await svc.from('conversations').update({ handoff_status: 'bot' }).eq('id', convId)
  }

  const reply = await processChannelMessage(svc, bot, { conversationId: convId, message: msg.text })

  const pageAccessToken = await connectionPageToken(connection.id)
  if (!pageAccessToken) throw new Error('No Page access token for connection')
  await sendTextMessage(msg.senderId, reply, pageAccessToken)
  await finish('processed', connection.id)
}
