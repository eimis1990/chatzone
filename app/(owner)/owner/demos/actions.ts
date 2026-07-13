'use server'

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

/** Create a prospect demo bot in the Loqara Demos org and open its editor. */
export async function createDemoBot(formData: FormData) {
  await requireRole('owner')
  const name = String(formData.get('name') ?? '').trim().slice(0, 60)
  if (!name) return

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot, error } = await svc
    .from('bots')
    .insert({ org_id: org.id, name, config: defaultBotConfig(name) as Bot['config'] })
    .select('id')
    .single<{ id: string }>()
  if (error || !bot) throw new Error(`Failed to create demo bot: ${error?.message}`)

  redirect(`/owner/clients/${org.id}/bots/${bot.id}/configure`)
}
