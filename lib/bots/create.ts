import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { defaultBotConfig } from '@/lib/validation/schemas'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

/**
 * Insert a bot into an org, enforcing that org's plan bot-limit. Single source
 * of truth shared by the client "create bot" action (own org) and the owner
 * "create bot for a client" action — so the limit can't drift between them.
 * Caller is responsible for authorizing access to `orgId`.
 */
export async function createBotInOrg(
  orgId: string,
  name: string,
): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Please enter a bot name.' }

  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single<{ plan: Plan | null }>()
  const limit = entitlementsFor(org?.plan ?? 'free').maxBots

  const { count } = await svc
    .from('bots')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
  if ((count ?? 0) >= limit) {
    return {
      error:
        limit === 1
          ? 'This plan includes 1 bot. Upgrade to add more.'
          : `This plan includes ${limit} bots. Upgrade to add more.`,
    }
  }

  const { data, error } = await svc
    .from('bots')
    .insert({ org_id: orgId, name: trimmed, config: defaultBotConfig(trimmed) })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) return { error: error?.message ?? 'Failed to create bot. Please try again.' }
  return { id: data.id }
}
