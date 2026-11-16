import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrganizationPolicy } from './organization-policy-server'

/** Billing sessions are distinct from the persistent chat thread. */
export function startsNewUsageSession(lastActivity: string | null, now = new Date()): boolean {
  if (!lastActivity) return true
  const last = new Date(lastActivity)
  return !Number.isFinite(last.getTime()) || now.getTime() - last.getTime() >= 24 * 60 * 60 * 1000 ||
    now.getUTCFullYear() !== last.getUTCFullYear() || now.getUTCMonth() !== last.getUTCMonth()
}

export interface SessionReservation {
  session_id: string | null
  allowed: boolean
  reason: 'existing' | 'reserved' | 'limit' | 'busy'
}

export async function reserveConversationSession(db: SupabaseClient, input: {
  orgId: string; botId: string; channel: 'web' | 'messenger' | 'instagram' | 'voice'; visitorId: string
}): Promise<SessionReservation> {
  const { entitlements } = await getOrganizationPolicy(db, input.orgId)
  const { data, error } = await db.rpc('reserve_conversation_session', {
    p_org: input.orgId, p_bot: input.botId, p_channel: input.channel, p_visitor: input.visitorId,
    p_limit: Number.isFinite(entitlements.conversations) ? entitlements.conversations : null,
  })
  if (error || !data?.[0]) throw new Error('Could not reserve conversation allowance')
  return data[0] as SessionReservation
}

export async function finishConversationSession(db: SupabaseClient, orgId: string, session: SessionReservation, success: boolean) {
  if (!session.session_id) return
  const { error } = await db.rpc('finish_conversation_session', { p_org: orgId, p_session: session.session_id, p_success: success })
  if (error) throw new Error('Could not record conversation usage')
}
