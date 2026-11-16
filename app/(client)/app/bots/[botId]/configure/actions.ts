'use server'

import { getOrganizationPolicy } from '@/lib/organization-policy-server'
import { validatePlanConfig } from '@/lib/organization-policy'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { botConfigSchema } from '@/lib/validation/schemas'
import { syncVoiceAgent } from '@/lib/ai/elevenlabs-agent'
import { resolvePromptVersionSnapshot } from '@/lib/prompt-versions'
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

  // Pinned prompt version → re-snapshot its content server-side (clients never
  // send or see prompt text).
  const versionError = await resolvePromptVersionSnapshot(config)
  if (versionError) return { success: false, error: versionError }

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
  const { data: current } = await supabase.from('bots').select('org_id, config').eq('id', botId).single()
  if (!current) return { success: false, error: 'Bot not found.' }
  const { entitlements } = await getOrganizationPolicy(supabase, current.org_id)
  const policyError = validatePlanConfig(config, current.config as BotConfig, entitlements)
  if (policyError) return { success: false, error: policyError }
  // Hidden language content survives a downgrade/save and can be reused later.
  config.content = { ...(current.config as BotConfig).content, ...config.content }
  const { error } = await supabase.from('bots').update(update).eq('id', botId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Keep the ElevenLabs voice agent (name + prompt) in sync with the saved config.
  await syncVoiceAgent(botId)

  return { success: true }
}
