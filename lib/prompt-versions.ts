import { createServiceClient } from '@/lib/supabase/service'
import type { BotConfig } from '@/lib/types'

/**
 * Server-side snapshot resolution, run by both bot-config save actions after
 * schema parse and BEFORE persisting. If the config pins a live version, the
 * version's content is re-snapshotted into `config.systemPrompt` here — so a
 * client can apply a version without ever seeing (or sending) prompt text, and
 * the snapshot can never disagree with the pinned version.
 *
 * Mutates `config` in place. Returns a user-facing error string, or null.
 */
export async function resolvePromptVersionSnapshot(config: BotConfig): Promise<string | null> {
  // No library link → version pointers are meaningless; drop any strays.
  if (!config.systemPromptId) {
    delete config.systemPromptVersionId
    delete config.previewSystemPromptVersionId
    return null
  }

  const ids = [config.systemPromptVersionId, config.previewSystemPromptVersionId].filter(
    (v): v is string => Boolean(v),
  )
  if (ids.length === 0) return null

  const svc = createServiceClient()
  const { data, error } = await svc
    .from('system_prompt_versions')
    .select('id, prompt_id, content')
    .in('id', ids)
  if (error) return 'Could not load the selected prompt version. Try again.'

  const byId = new Map((data ?? []).map((v) => [v.id, v]))
  for (const id of ids) {
    const v = byId.get(id)
    if (!v || v.prompt_id !== config.systemPromptId) {
      return 'The selected assistant version does not belong to this bot. Refresh and try again.'
    }
  }

  const live = config.systemPromptVersionId ? byId.get(config.systemPromptVersionId) : undefined
  if (live) config.systemPrompt = live.content
  return null
}
