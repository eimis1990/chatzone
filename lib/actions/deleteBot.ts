'use server'

import { getUserOrgIds } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Delete a bot belonging to the signed-in user's org. Org membership is
 * verified server-side; all bot data (knowledge, conversations, leads,
 * events) goes with it via FK cascades.
 */
export async function deleteBot(botId: string): Promise<{ error?: string }> {
  const ids = await getUserOrgIds()
  const oid = ids[0]
  if (!oid) return { error: 'No organization found.' }

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, org_id')
    .eq('id', botId)
    .single<{ id: string; org_id: string }>()
  if (!bot || bot.org_id !== oid) return { error: 'Bot not found.' }

  const { error } = await svc.from('bots').delete().eq('id', botId)
  if (error) return { error: 'Failed to delete bot. Please try again.' }
  return {}
}
