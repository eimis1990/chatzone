'use server'

import { getUserOrgIds } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { defaultBotConfig } from '@/lib/validation/schemas'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

/**
 * Create a bot for the signed-in user's org, enforcing the plan's bot limit.
 * Runs on the server (service client) after verifying org membership, so the
 * limit can't be bypassed from the browser.
 */
export async function createBot(name: string): Promise<{ id?: string; error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Please enter a bot name.' }

  const ids = await getUserOrgIds()
  const oid = ids[0]
  if (!oid) return { error: 'No organization found.' }

  const svc = createServiceClient()
  const { data: org } = await svc
    .from('organizations')
    .select('plan')
    .eq('id', oid)
    .single<{ plan: Plan | null }>()
  const limit = entitlementsFor(org?.plan ?? 'free').maxBots

  const { count } = await svc
    .from('bots')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', oid)
  if ((count ?? 0) >= limit) {
    return {
      error:
        limit === 1
          ? 'Your plan includes 1 bot. Upgrade to add more.'
          : `Your plan includes ${limit} bots. Upgrade to add more.`,
    }
  }

  const { data, error } = await svc
    .from('bots')
    .insert({ org_id: oid, name: trimmed, config: defaultBotConfig(trimmed) })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) return { error: error?.message ?? 'Failed to create bot. Please try again.' }
  return { id: data.id }
}
