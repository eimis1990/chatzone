'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Owner toggle: show/hide Loqara's own bot on the public landing page.
 * Flips instantly (independent of the config Save) and revalidates the landing
 * page so visitors see/stop-seeing the widget right away.
 */
export async function setLandingVisible(botId: string, visible: boolean): Promise<void> {
  await requireRole('owner')
  const svc = createServiceClient()
  const { error } = await svc.from('bots').update({ show_on_landing: visible }).eq('id', botId)
  if (error) throw new Error(`Failed to update landing visibility: ${error.message}`)
  revalidatePath('/')
  revalidatePath('/owner/chatbot')
}
