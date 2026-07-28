'use server'

import { revalidatePath } from 'next/cache'
import { getSessionUser } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { componentMeta } from '@/lib/widget-components/meta'
import { assignedComponentVariants } from '@/lib/widget-components/availability'
import type { BotConfig } from '@/lib/types'

/**
 * Set the variant a bot renders for one component. Shared by the client page
 * and the owner's twin page: clients reach the bot through RLS (own org only);
 * the owner writes with the service client.
 */
export async function setComponentVariant(
  botId: string,
  componentKey: string,
  variantId: string,
): Promise<{ success: boolean; error?: string }> {
  const user = await getSessionUser()
  if (!user) return { success: false, error: 'Not signed in.' }

  const meta = componentMeta(componentKey)
  if (!meta) return { success: false, error: 'Unknown component.' }
  if (!meta.variants.some((v) => v.id === variantId)) {
    return { success: false, error: 'Unknown variant.' }
  }

  // RLS scopes the read: clients see own-org bots, the owner sees own bots.
  // Owners editing a CLIENT bot fall through to the service client below.
  const supabase = await createServerClient()
  let { data: bot } = await supabase
    .from('bots')
    .select('id, config')
    .eq('id', botId)
    .maybeSingle<{ id: string; config: BotConfig }>()

  const svc = createServiceClient()
  let useService = false
  if (!bot) {
    if (user.profile.role !== 'owner') return { success: false, error: 'Bot not found.' }
    useService = true
    const res = await svc
      .from('bots')
      .select('id, config')
      .eq('id', botId)
      .maybeSingle<{ id: string; config: BotConfig }>()
    bot = res.data
  }
  if (!bot) return { success: false, error: 'Bot not found.' }

  // The VARIANT must be assigned to this bot's provider folder (+ core).
  const allowed = await assignedComponentVariants(svc, bot.config.commerce?.provider ?? null)
  if (!allowed.get(componentKey)?.has(variantId)) {
    return { success: false, error: 'This variant is not available for this bot.' }
  }

  const config: BotConfig = {
    ...bot.config,
    components: { ...bot.config.components, [componentKey]: variantId },
  }
  const writer = useService ? svc : supabase
  const { error } = await writer.from('bots').update({ config }).eq('id', botId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/app/bots/${botId}/components`)
  return { success: true }
}
