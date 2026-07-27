'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { PromptVersionMeta } from '@/lib/types'

/**
 * Version metadata for a bot's prompt family — number, note, date only, never
 * content. Used by the client-facing "Assistant version" dropdowns (clients
 * can't read system_prompt_versions under RLS; access is proven by being able
 * to see the bot itself).
 */
export async function listAssistantVersions(botId: string): Promise<PromptVersionMeta[]> {
  const supabase = await createServerClient()
  const { data: bot } = await supabase.from('bots').select('config').eq('id', botId).single()
  const promptId = (bot?.config as { systemPromptId?: string } | null)?.systemPromptId
  if (!promptId) return []

  const svc = createServiceClient()
  const { data } = await svc
    .from('system_prompt_versions')
    .select('id, version, note, published_at')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false })
    .returns<PromptVersionMeta[]>()
  return data ?? []
}
