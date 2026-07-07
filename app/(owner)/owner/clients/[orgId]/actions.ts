'use server'

import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { createBotInOrg } from '@/lib/bots/create'
import type { OrgStatus } from '@/lib/types'

/**
 * Toggles an organisation's status between 'active' and 'suspended'.
 * Only the owner role may call this action.
 */
export async function toggleOrgStatus(
  orgId: string,
  currentStatus: 'active' | 'suspended',
): Promise<void> {
  await requireRole('owner')

  const nextStatus: OrgStatus = currentStatus === 'active' ? 'suspended' : 'active'

  const service = createServiceClient()
  const { error } = await service
    .from('organizations')
    .update({ status: nextStatus })
    .eq('id', orgId)

  if (error) {
    throw new Error(`Failed to update organisation status: ${error.message}`)
  }
}

/**
 * Create a bot for a client org on the client's behalf (owner "done-for-you"
 * setup) — used when a client accepted their invite but never created a first
 * bot. Owner-only; enforces the client plan's bot limit like the client flow.
 */
export async function createBotForOrg(
  orgId: string,
  name: string,
): Promise<{ id?: string; error?: string }> {
  await requireRole('owner')
  return createBotInOrg(orgId, name)
}
