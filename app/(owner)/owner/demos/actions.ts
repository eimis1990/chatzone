'use server'

import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

/**
 * Create a prospect demo bot in the Loqara Demos org. Returns the id so the
 * shared CreateBotDialog can route to /owner/demos/[id]/configure.
 */
export async function createDemoBot(name: string): Promise<{ id?: string; error?: string }> {
  await requireRole('owner')
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return { error: 'Please enter a name.' }

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot, error } = await svc
    .from('bots')
    .insert({ org_id: org.id, name: trimmed, config: defaultBotConfig(trimmed) as Bot['config'] })
    .select('id')
    .single<{ id: string }>()
  if (error || !bot) return { error: error?.message ?? 'Failed to create the demo bot.' }
  return { id: bot.id }
}
