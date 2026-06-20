'use server'

import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { botConfigSchema } from '@/lib/validation/schemas'
import type { BotConfig } from '@/lib/types'

export interface SaveConfigResult {
  success: boolean
  error?: string
}

export async function saveConfig(
  botId: string,
  rawConfig: unknown,
): Promise<SaveConfigResult> {
  // 1. Require authenticated client
  await requireRole('client')

  // 2. Re-validate on the server — never trust client-provided data
  const parsed = botConfigSchema.safeParse(rawConfig)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(', '),
    }
  }

  const config: BotConfig = parsed.data

  // 3. Update — RLS ensures the row belongs to this user's org
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('bots')
    .update({ config })
    .eq('id', botId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
