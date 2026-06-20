'use server'

import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
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
