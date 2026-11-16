import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { organizationEntitlements, type OrganizationPolicyRow } from './organization-policy'

export const POLICY_COLUMNS = 'plan,is_demo,is_platform,free_legacy,free_policy_effective_at,free_policy_paused'

export async function getOrganizationPolicy(db: SupabaseClient, orgId: string) {
  const { data, error } = await db.from('organizations').select(POLICY_COLUMNS).eq('id', orgId)
    .single<OrganizationPolicyRow>()
  if (error || !data) throw new Error('Could not verify organization plan')
  return { org: data, entitlements: effectiveOrganizationEntitlements(data) }
}

/** Sales switch is independent from already-purchased Basic entitlements. */
export function basicSalesEnabled(): boolean {
  return process.env.BASIC_PLAN_ENABLED === 'true'
}

/** Mutates only the fetched in-memory bot, never its stored configuration. */
export async function applyBotPolicy(db: SupabaseClient, bot: { org_id: string; config: import('./types').BotConfig }) {
  const { entitlements } = await getOrganizationPolicy(db, bot.org_id)
  const { applyPlanToConfig } = await import('./organization-policy')
  bot.config = applyPlanToConfig(bot.config, entitlements)
  return entitlements
}

/** Shared resolver for public widget reads and authenticated policy reads. */
export const effectiveOrganizationEntitlements = organizationEntitlements
