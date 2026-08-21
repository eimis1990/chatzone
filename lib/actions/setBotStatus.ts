'use server'

import { getUserOrgIds } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { entitlementsFor, isInternalOrg } from '@/lib/entitlements'
import type { BotStatus, Plan } from '@/lib/types'

/**
 * Pause or activate a bot in the signed-in user's org. Pausing is always
 * allowed (a paused bot stops answering everywhere — widget, voice,
 * Messenger). Activating is guarded by the plan's active-bot allowance, so
 * clients over the limit after a downgrade choose which bots stay active by
 * pausing one before activating another.
 */
export async function setBotStatus(
  botId: string,
  status: BotStatus,
): Promise<{ error?: string }> {
  const ids = await getUserOrgIds()
  const oid = ids[0]
  if (!oid) return { error: 'No organization found.' }

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, org_id, status')
    .eq('id', botId)
    .single<{ id: string; org_id: string; status: BotStatus }>()
  if (!bot || bot.org_id !== oid) return { error: 'Bot not found.' }
  if (bot.status === status) return {}

  if (status === 'active') {
    const { data: org } = await svc
      .from('organizations')
      .select('plan, is_demo, is_platform')
      .eq('id', oid)
      .single<{ plan: Plan | null; is_demo: boolean | null; is_platform: boolean | null }>()
    const limit = entitlementsFor(org?.plan ?? 'free').maxBots
    if (org && !isInternalOrg(org) && Number.isFinite(limit)) {
      const { count } = await svc
        .from('bots')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', oid)
        .eq('status', 'active')
      if ((count ?? 0) >= limit) {
        return {
          error:
            limit === 1
              ? 'Your plan includes 1 active bot. Pause it first, or upgrade.'
              : `Your plan includes ${limit} active bots. Pause one first, or upgrade.`,
        }
      }
    }
  }

  const { error } = await svc.from('bots').update({ status }).eq('id', botId)
  if (error) return { error: 'Failed to update the bot. Please try again.' }
  return {}
}
