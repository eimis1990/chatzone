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
  name?: string,
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

  // Optional internal bot name (sidebar label). Validate length when provided.
  const update: { config: BotConfig; name?: string } = { config }
  if (typeof name === 'string') {
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 60) {
      return { success: false, error: 'Bot name must be 1–60 characters.' }
    }
    update.name = trimmed
  }

  // 3. Update — RLS ensures the row belongs to this user's org
  const supabase = await createServerClient()
  const { error } = await supabase.from('bots').update(update).eq('id', botId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
