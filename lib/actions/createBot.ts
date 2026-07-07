'use server'

import { getUserOrgIds } from '@/lib/auth/guards'
import { createBotInOrg } from '@/lib/bots/create'

/**
 * Create a bot for the signed-in user's org, enforcing the plan's bot limit.
 * Runs on the server after verifying org membership, so the limit can't be
 * bypassed from the browser.
 */
export async function createBot(name: string): Promise<{ id?: string; error?: string }> {
  const ids = await getUserOrgIds()
  const oid = ids[0]
  if (!oid) return { error: 'No organization found.' }
  return createBotInOrg(oid, name)
}
