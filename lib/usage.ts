import type { SupabaseClient } from '@supabase/supabase-js'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

/** Start of the current calendar month (UTC) as an ISO string. */
export function monthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Pure: is the org over its plan's monthly conversation allowance? */
export function overConversationLimit(used: number, plan: Plan | null | undefined): boolean {
  const limit = entitlementsFor(plan).conversations
  return Number.isFinite(limit) && used >= limit
}

/** Conversations started this calendar month across ALL of the org's bots. */
export async function conversationsThisMonth(
  svc: SupabaseClient,
  orgId: string,
): Promise<number> {
  const { data: bots } = await svc.from('bots').select('id').eq('org_id', orgId)
  const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
  if (!botIds.length) return 0
  const { count } = await svc
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .in('bot_id', botIds)
    .gte('started_at', monthStartISO())
  return count ?? 0
}

/**
 * Whether the org has hit its monthly conversation limit (hard block). Counts
 * org-wide, so multiple bots share one pool. Unlimited plans never block.
 */
export async function isOverConversationLimit(
  svc: SupabaseClient,
  orgId: string,
): Promise<boolean> {
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single<{ plan: Plan | null }>()
  const limit = entitlementsFor(org?.plan ?? 'free').conversations
  if (!Number.isFinite(limit)) return false
  return (await conversationsThisMonth(svc, orgId)) >= limit
}
