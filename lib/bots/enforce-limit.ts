import type { SupabaseClient } from '@supabase/supabase-js'
import { entitlementsFor, isInternalOrg } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

/**
 * Active-bot limit enforcement for plan downgrades. Bots are never deleted:
 * extras are PAUSED (widget-config/chat/voice/Messenger all 404 paused bots,
 * so a paused bot stops working on live sites immediately). The client can
 * swap which bots stay active from the bot cards — activation is guarded by
 * the same limit in lib/actions/setBotStatus.ts.
 */

/**
 * Pure: which bots to pause so at most `limit` stay active. Keeps the OLDEST
 * active bots (most likely the client's primary bot) and pauses the newest
 * extras. Already-paused bots are left alone.
 */
export function botIdsToPause(
  bots: { id: string; status: string; created_at: string }[],
  limit: number,
): string[] {
  if (!Number.isFinite(limit)) return []
  return bots
    .filter((b) => b.status === 'active')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(Math.max(0, limit))
    .map((b) => b.id)
}

/**
 * Pause the org's newest active bots beyond its plan's allowance. Internal
 * orgs (platform/demo) are exempt — owner assets are never auto-paused.
 * Returns the number of bots paused.
 */
export async function enforceActiveBotLimit(svc: SupabaseClient, orgId: string): Promise<number> {
  const { data: org } = await svc
    .from('organizations')
    .select('plan, is_demo, is_platform')
    .eq('id', orgId)
    .single<{ plan: Plan | null; is_demo: boolean | null; is_platform: boolean | null }>()
  if (!org || isInternalOrg(org)) return 0
  const limit = entitlementsFor(org.plan ?? 'free').maxBots
  if (!Number.isFinite(limit)) return 0

  const { data: bots } = await svc
    .from('bots')
    .select('id, status, created_at')
    .eq('org_id', orgId)
  const toPause = botIdsToPause((bots ?? []) as { id: string; status: string; created_at: string }[], limit)
  if (!toPause.length) return 0

  const { error } = await svc.from('bots').update({ status: 'paused' }).in('id', toPause)
  if (error) {
    console.error('[bots] limit enforcement failed:', error.message)
    return 0
  }
  return toPause.length
}
