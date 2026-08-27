import type { SupabaseClient } from '@supabase/supabase-js'
import { connectionPageToken } from '@/lib/channels/outbound'

const GRAPH = 'https://graph.facebook.com/v23.0'

/**
 * Disconnect an external channel connection: stop Meta delivering the account's
 * messages, then drop the row (which discards the encrypted token).
 *
 * Conversations survive — `conversations.channel_connection_id` is
 * `on delete set null`, so transcripts, leads and analytics stay intact for a
 * client who reconnects later.
 */
export async function disconnectChannel(
  svc: SupabaseClient,
  connectionId: string,
  orgId: string,
): Promise<{ error?: string }> {
  const { data: conn } = await svc
    .from('channel_connections')
    .select('id, org_id')
    .eq('id', connectionId)
    .eq('org_id', orgId) // never let one org disconnect another's channel
    .maybeSingle<{ id: string; org_id: string }>()
  if (!conn) return { error: 'Connection not found.' }

  // Best-effort unsubscribe: a dead or revoked token means Meta has already
  // stopped delivering, so a failure here must not block the disconnect.
  const token = await connectionPageToken(connectionId)
  if (token) {
    try {
      await fetch(`${GRAPH}/me/subscribed_apps?access_token=${token}`, { method: 'DELETE' })
    } catch (err) {
      console.error('[channels] unsubscribe failed:', err instanceof Error ? err.message : err)
    }
  }

  const { error } = await svc.from('channel_connections').delete().eq('id', connectionId)
  if (error) return { error: 'Could not disconnect. Please try again.' }
  return {}
}
