import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AbuseAssessment, VisitorBlockReason } from '@/lib/security/visitor-abuse'
import {
  extendVisitorBlockExpiry,
  VISITOR_BLOCK_DURATION_MS,
} from '@/lib/visitor-block-shared'

export interface ActiveVisitorBlock {
  expiresAt: string
  reason: VisitorBlockReason
}

export async function getActiveVisitorBlock(
  db: SupabaseClient,
  botId: string,
  visitorId: string,
): Promise<ActiveVisitorBlock | null> {
  const { data, error } = await db
    .from('visitor_blocks')
    .select('expires_at, reason')
    .eq('bot_id', botId)
    .eq('visitor_id', visitorId)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle<{ expires_at: string; reason: VisitorBlockReason }>()

  if (error) {
    console.error('[visitor-blocks] Failed to read active block', error)
    return null
  }
  return data ? { expiresAt: data.expires_at, reason: data.reason } : null
}

export async function getActiveVisitorBlocks(
  db: SupabaseClient,
  botId: string,
  visitorIds: string[],
): Promise<Map<string, ActiveVisitorBlock>> {
  const uniqueVisitorIds = [...new Set(visitorIds)]
  if (!uniqueVisitorIds.length) return new Map()

  const { data, error } = await db
    .from('visitor_blocks')
    .select('visitor_id, expires_at, reason')
    .eq('bot_id', botId)
    .in('visitor_id', uniqueVisitorIds)
    .gt('expires_at', new Date().toISOString())

  if (error) throw error

  return new Map(
    (data ?? []).map((row) => [
      row.visitor_id as string,
      {
        expiresAt: row.expires_at as string,
        reason: row.reason as VisitorBlockReason,
      },
    ]),
  )
}

export async function unblockVisitor(
  db: SupabaseClient,
  botId: string,
  visitorId: string,
): Promise<void> {
  const { error } = await db
    .from('visitor_blocks')
    .delete()
    .eq('bot_id', botId)
    .eq('visitor_id', visitorId)

  if (error) throw error
}

export async function extendActiveVisitorBlock(
  db: SupabaseClient,
  botId: string,
  visitorId: string,
  now = new Date(),
): Promise<ActiveVisitorBlock | null> {
  // Compare-and-swap plus one retry preserves both additions when two dashboard
  // sessions extend the same block at nearly the same time.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: current, error: readError } = await db
      .from('visitor_blocks')
      .select('expires_at, reason')
      .eq('bot_id', botId)
      .eq('visitor_id', visitorId)
      .gt('expires_at', now.toISOString())
      .maybeSingle<{ expires_at: string; reason: VisitorBlockReason }>()

    if (readError) throw readError
    if (!current) return null

    const expiresAt = extendVisitorBlockExpiry(current.expires_at, now)
    const { data: updated, error: updateError } = await db
      .from('visitor_blocks')
      .update({ expires_at: expiresAt })
      .eq('bot_id', botId)
      .eq('visitor_id', visitorId)
      .eq('expires_at', current.expires_at)
      .select('expires_at, reason')
      .maybeSingle<{ expires_at: string; reason: VisitorBlockReason }>()

    if (updateError) throw updateError
    if (updated) return { expiresAt: updated.expires_at, reason: updated.reason }
  }

  throw new Error('Visitor block changed while it was being extended')
}

export async function loadRecentVisitorMessages(
  db: SupabaseClient,
  botId: string,
  visitorId: string,
): Promise<string[]> {
  const { data: conversations, error: conversationError } = await db
    .from('conversations')
    .select('id')
    .eq('bot_id', botId)
    .eq('visitor_id', visitorId)
    .order('started_at', { ascending: false })
    .limit(8)

  if (conversationError) {
    console.error('[visitor-blocks] Failed to load visitor conversations', conversationError)
    return []
  }
  const conversationIds = (conversations ?? []).map((row) => row.id as string)
  if (!conversationIds.length) return []

  const { data: messages, error: messageError } = await db
    .from('messages')
    .select('content')
    .in('conversation_id', conversationIds)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(12)

  if (messageError) {
    console.error('[visitor-blocks] Failed to load recent visitor messages', messageError)
    return []
  }
  return (messages ?? []).map((row) => row.content as string)
}

export async function blockVisitor(
  db: SupabaseClient,
  input: {
    botId: string
    visitorId: string
    assessment: AbuseAssessment
    conversationId?: string
    triggerMessageId?: string
    source?: 'automatic' | 'manual'
    now?: Date
  },
): Promise<ActiveVisitorBlock> {
  if (!input.assessment.reason) throw new Error('A block reason is required')

  const now = input.now ?? new Date()
  const expiresAt = new Date(now.getTime() + VISITOR_BLOCK_DURATION_MS).toISOString()
  const blockedAt = now.toISOString()
  const { error } = await db.from('visitor_blocks').upsert(
    {
      bot_id: input.botId,
      visitor_id: input.visitorId,
      reason: input.assessment.reason,
      details: { signals: input.assessment.signals, detector: 'v1' },
      conversation_id: input.conversationId ?? null,
      trigger_message_id: input.triggerMessageId ?? null,
      source: input.source ?? 'automatic',
      blocked_at: blockedAt,
      expires_at: expiresAt,
    },
    { onConflict: 'bot_id,visitor_id' },
  )
  if (error) throw error
  return { expiresAt, reason: input.assessment.reason }
}
