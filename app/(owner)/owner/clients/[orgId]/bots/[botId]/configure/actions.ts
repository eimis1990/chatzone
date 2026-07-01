'use server'

import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { botConfigSchema } from '@/lib/validation/schemas'
import { syncVoiceAgent } from '@/lib/ai/elevenlabs-agent'
import type { BotConfig } from '@/lib/types'
import type { SaveConfigResult } from '@/app/(client)/app/bots/[botId]/configure/actions'

/**
 * Owner-side save: lets the platform owner configure ANY client's bot (done-for-you
 * setup). Mirrors the client `saveConfig` but is gated to the `owner` role and writes
 * with the service client (bypasses RLS). Signature matches ConfigForm's `onSave`.
 */
export async function saveClientBotConfig(
  botId: string,
  rawConfig: unknown,
  name?: string,
): Promise<SaveConfigResult> {
  await requireRole('owner')

  const parsed = botConfigSchema.safeParse(rawConfig)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const config: BotConfig = parsed.data
  const update: { config: BotConfig; name?: string } = { config }
  if (typeof name === 'string') {
    const trimmed = name.trim()
    if (trimmed.length < 1 || trimmed.length > 60) {
      return { success: false, error: 'Bot name must be 1–60 characters.' }
    }
    update.name = trimmed
  }

  const service = createServiceClient()
  const { error } = await service.from('bots').update(update).eq('id', botId)
  if (error) return { success: false, error: error.message }

  // Keep the ElevenLabs voice agent (name + prompt) in sync with the saved config.
  await syncVoiceAgent(botId)

  return { success: true }
}
