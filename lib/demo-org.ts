import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'

/**
 * The single "Loqara Demos" org that holds prospect showcase bots created from
 * the owner portal. Enterprise + voice so the config form exposes every
 * feature; `is_demo` keeps it out of client stats and lists. Find-or-create,
 * mirroring the platform-org pattern (lib/platform-bot.ts).
 */
export async function getOrCreateDemoOrg(): Promise<{ id: string }> {
  const svc = createServiceClient()

  const { data: org } = await svc
    .from('organizations')
    .select('id')
    .eq('is_demo', true)
    .maybeSingle<{ id: string }>()
  if (org) return org

  const { data, error } = await svc
    .from('organizations')
    .insert({
      name: 'Loqara Demos',
      slug: 'loqara-demos',
      plan: 'enterprise',
      voice_addon: true,
      is_demo: true,
    })
    .select('id')
    .single<{ id: string }>()
  if (error || !data) throw new Error(`Failed to create demo org: ${error?.message}`)
  return data
}
