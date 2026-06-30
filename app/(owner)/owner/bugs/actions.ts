'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { bugStatusSchema } from '@/lib/validation/schemas'
import type { BugStatus } from '@/lib/types'

/** Owner-only: triage a bug report (open → in progress → resolved). */
export async function updateBugStatus(id: string, status: BugStatus) {
  await requireRole('owner')
  const next = bugStatusSchema.parse(status)
  const svc = createServiceClient()
  const { error } = await svc
    .from('bug_reports')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/owner/bugs')
}
