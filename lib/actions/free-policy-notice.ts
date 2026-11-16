'use server'
import { getUserOrgIds, requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'

/** Called only after the authenticated in-app notice has actually mounted. */
export async function recordFreePolicyNotice(): Promise<string | null> {
  await requireRole('client')
  if (process.env.FREE_POLICY_NOTICE_ENABLED !== 'true') return null
  const orgId = (await getUserOrgIds())[0]
  if (!orgId) return null
  const db = createServiceClient()
  const deadline = new Date(Date.now() + 30 * 86_400_000).toISOString()
  const { error } = await db.from('organizations').update({ free_policy_effective_at: deadline })
    .eq('id', orgId).eq('plan', 'free').eq('free_legacy', true).is('free_policy_effective_at', null)
  if (error) throw new Error('Could not record plan notice')
  const { data, error: readError } = await db.from('organizations').select('free_policy_effective_at')
    .eq('id', orgId).eq('plan', 'free').eq('free_legacy', true).maybeSingle()
  if (readError) throw new Error('Could not load plan notice date')
  return data?.free_policy_effective_at ?? null
}
