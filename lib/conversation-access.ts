import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrganizationPolicy } from './organization-policy-server'

/** RLS ownership is checked before resolving a conversation's plan. */
export async function canHandleConversation(db: SupabaseClient, conversationId: string): Promise<boolean> {
  const { data: conv, error } = await db.from('conversations')
    .select('bot_id, handoff_status, handoff_requested_at').eq('id', conversationId).maybeSingle()
  if (error || !conv) return false
  const { data: bot } = await db.from('bots').select('org_id').eq('id', conv.bot_id).maybeSingle()
  if (!bot) return false
  const { org, entitlements } = await getOrganizationPolicy(db, bot.org_id)
  if (entitlements.handoff) return true
  // An already-live legacy handoff may finish for up to 24 hours after the
  // announced deadline. This does not permit new handoff requests.
  const deadline = org.free_legacy && org.free_policy_effective_at ? Date.parse(org.free_policy_effective_at) : 0
  return Boolean(deadline && conv.handoff_status === 'live' && conv.handoff_requested_at &&
    Date.parse(conv.handoff_requested_at) < deadline && Date.now() < deadline + 86_400_000)
}
