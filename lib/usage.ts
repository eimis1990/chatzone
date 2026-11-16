import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrganizationPolicy } from '@/lib/organization-policy-server'
import { entitlementsFor } from '@/lib/entitlements'
import { notifyUsageWarning } from '@/lib/notify'
import type { Plan } from '@/lib/types'

/** Fraction of the monthly allowance that triggers the one warning email. */
export const USAGE_WARNING_THRESHOLD = 0.8

/** Start of the current calendar month (UTC) as an ISO string. */
export function monthStartISO(now: Date = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

/** Pure: is the org over its plan's monthly allowance plus purchased top-ups? */
export function overConversationLimit(
  used: number,
  plan: Plan | null | undefined,
  extraCredits = 0,
): boolean {
  const limit = entitlementsFor(plan).conversations
  return Number.isFinite(limit) && used >= limit + Math.max(0, extraCredits)
}

/** Purchased extra conversations applying to the current calendar month. */
export async function extraConversationsThisMonth(
  svc: SupabaseClient,
  orgId: string,
): Promise<number> {
  const { data, error } = await svc
    .from('conversation_credits')
    .select('conversations')
    .eq('org_id', orgId)
    .eq('month', monthStartISO().slice(0, 10))
  if (error) throw new Error('Could not load purchased credits')
  return ((data ?? []) as { conversations: number }[]).reduce((sum, r) => sum + r.conversations, 0)
}

/** Conversations started this calendar month across ALL of the org's bots. */
export async function conversationsThisMonth(
  svc: SupabaseClient,
  orgId: string,
): Promise<number> {
  const { count, error } = await svc.from('conversation_usage_sessions')
    .select('id', { count: 'exact', head: true }).eq('org_id', orgId)
    .eq('month', monthStartISO().slice(0, 10)).not('committed_at', 'is', null)
  if (error) throw new Error('Could not load conversation usage')
  return count ?? 0
}

/** Pure: has usage crossed the warning threshold of a finite limit? */
export function shouldWarnUsage(used: number, plan: Plan | null | undefined): boolean {
  const limit = entitlementsFor(plan).conversations
  return Number.isFinite(limit) && used >= Math.ceil(limit * USAGE_WARNING_THRESHOLD)
}

/**
 * Email the org's admins ONCE per calendar month when they cross 80% of the
 * conversation allowance. Race-safe: the `usage_warned_at` stamp is claimed
 * with a guarded update before sending, so concurrent conversations can't
 * double-send. Fire-and-forget — never throws.
 */
export async function maybeSendUsageWarning(svc: SupabaseClient, orgId: string): Promise<void> {
  try {
    const { data: org } = await svc
      .from('organizations')
      .select('plan, usage_warned_at')
      .eq('id', orgId)
      .single<{ plan: Plan | null; usage_warned_at: string | null }>()
    if (!org) return
    const [{ entitlements }, credits] = await Promise.all([getOrganizationPolicy(svc, orgId), extraConversationsThisMonth(svc, orgId)])
    const limit = entitlements.conversations + credits
    if (!Number.isFinite(limit)) return
    const monthStart = monthStartISO()
    if (org.usage_warned_at && org.usage_warned_at >= monthStart) return // already warned this month

    const used = await conversationsThisMonth(svc, orgId)
    if (used < Math.ceil(limit * USAGE_WARNING_THRESHOLD)) return

    // Claim the stamp; only the winner of a concurrent race gets a row back.
    const { data: claimed } = await svc
      .from('organizations')
      .update({ usage_warned_at: new Date().toISOString() })
      .eq('id', orgId)
      .or(`usage_warned_at.is.null,usage_warned_at.lt.${monthStart}`)
      .select('id')
    if (!claimed?.length) return

    await notifyUsageWarning(svc, orgId, used, limit)
  } catch (err) {
    console.error('[usage] warning check failed:', err)
  }
}

/**
 * Whether the org has hit its monthly conversation limit (hard block). Counts
 * org-wide, so multiple bots share one pool. Unlimited plans never block.
 */
export async function isOverConversationLimit(
  svc: SupabaseClient,
  orgId: string,
): Promise<boolean> {
  const { entitlements } = await getOrganizationPolicy(svc, orgId)
  const limit = entitlements.conversations
  if (!Number.isFinite(limit)) return false
  const [used, extra] = await Promise.all([
    conversationsThisMonth(svc, orgId), extraConversationsThisMonth(svc, orgId),
  ])
  return used >= limit + extra
}
