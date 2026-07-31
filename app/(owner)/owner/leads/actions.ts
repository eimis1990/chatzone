'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import type { SalesLeadStatus } from '@/lib/types'

const STATUSES: SalesLeadStatus[] = [
  'ready',
  'email_sent',
  'follow_up_email',
  'wants_demo',
  'demo_ready',
  'demo_presented',
  'testing_bot',
  'rejected',
  'client',
]

/** Owner pipeline: move a sales lead to a new status. */
export async function setLeadStatus(leadId: string, status: SalesLeadStatus): Promise<void> {
  await requireRole('owner')
  if (!STATUSES.includes(status)) throw new Error('Invalid status')
  const svc = createServiceClient()
  const changedAt = new Date().toISOString()
  const { error } = await svc
    .from('sales_leads')
    .update({ status, status_updated_at: changedAt, updated_at: changedAt })
    .eq('id', leadId)
  if (error) throw new Error(`Failed to update lead: ${error.message}`)
  revalidatePath('/owner/leads')
}
