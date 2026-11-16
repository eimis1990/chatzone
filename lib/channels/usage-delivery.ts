import type { SupabaseClient } from '@supabase/supabase-js'
import { finishConversationSession, type SessionReservation } from '@/lib/conversation-sessions'

/** Journal before sending, then keep Meta's receipt for accounting recovery.
 * Never retry an external send: an ambiguous network failure needs review. */
export async function deliverMeteredChannelReply(db: SupabaseClient, input: {
  provider: string; eventId: string; orgId: string; reservation: SessionReservation | null
}, send: () => Promise<{ messageId: string }>) {
  const update = async (patch: Record<string, unknown>) => {
    const { error } = await db.from('channel_webhook_events').update(patch)
      .eq('provider', input.provider).eq('event_id', input.eventId)
    if (error) throw new Error('Could not journal channel delivery')
  }
  let delivered = false
  try {
    await update({ usage_org_id: input.orgId, usage_session_id: input.reservation?.session_id ?? null })
    const receipt = await send()
    delivered = true
    try {
      await update({ outbound_message_id: receipt.messageId })
      if (input.reservation) await finishConversationSession(db, input.orgId, input.reservation, true)
      await update({ usage_committed_at: new Date().toISOString() })
    } catch (error) {
      // The outer handler persists this diagnostic if the database recovers.
      throw new Error(`Delivered ${receipt.messageId}; accounting needs review: ${error instanceof Error ? error.message : 'unknown'}`)
    }
  } finally {
    if (input.reservation && !delivered) await finishConversationSession(db, input.orgId, input.reservation, false)
  }
}
