'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncVoiceAgent } from '@/lib/ai/elevenlabs-agent'
import { SYSTEM_PROMPT_MAX } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

/** Validate name + content, throwing a clean, user-facing message (not a raw ZodError). */
function clean(name: string, content: string): { name: string; content: string } {
  const n = name.trim()
  if (!n) throw new Error('Give the prompt a name.')
  if (n.length > 120) throw new Error('Name is too long (max 120 characters).')
  if (content.length > SYSTEM_PROMPT_MAX) {
    throw new Error(
      `Prompt is too long — ${content.length.toLocaleString()} / ${SYSTEM_PROMPT_MAX.toLocaleString()} characters. Please shorten it.`,
    )
  }
  return { name: n, content }
}

/** Bots that reference a given library prompt (via config.systemPromptId). */
async function referencingBots(id: string) {
  const svc = createServiceClient()
  const { data } = await svc
    .from('bots')
    .select('id, config')
    .eq('config->>systemPromptId', id)
    .returns<Pick<Bot, 'id' | 'config'>[]>()
  return { svc, bots: data ?? [] }
}

export async function createSystemPrompt(name: string, content: string): Promise<void> {
  await requireRole('owner')
  const fields = clean(name, content)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('system_prompts')
    .insert({ ...fields, created_by: user?.id ?? null })
  if (error) throw new Error(error.message)
  revalidatePath('/owner/prompts')
}

export async function updateSystemPrompt(id: string, name: string, content: string): Promise<void> {
  await requireRole('owner')
  const fields = clean(name, content)
  const parsedContent = fields.content
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('system_prompts')
    .update({ name: fields.name, content: parsedContent })
    .eq('id', id)
  if (error) throw new Error(error.message)

  // Single source of truth: push the new content to every bot using this prompt
  // (refresh the snapshot in config.systemPrompt) and re-sync their voice agents.
  const { svc, bots } = await referencingBots(id)
  for (const b of bots) {
    await svc.from('bots').update({ config: { ...b.config, systemPrompt: parsedContent } }).eq('id', b.id)
    if (b.config.voice?.enabled) {
      try {
        await syncVoiceAgent(b.id)
      } catch {
        // non-fatal — the next voice call re-syncs
      }
    }
  }
  revalidatePath('/owner/prompts')
}

export async function deleteSystemPrompt(id: string): Promise<void> {
  await requireRole('owner')
  const supabase = await createServerClient()
  const { error } = await supabase.from('system_prompts').delete().eq('id', id)
  if (error) throw new Error(error.message)

  // Bots keep their current prompt text (the snapshot); just drop the now-dangling
  // reference so they show as "custom" rather than pointing at a deleted entry.
  const { svc, bots } = await referencingBots(id)
  for (const b of bots) {
    const nextConfig = { ...b.config }
    delete (nextConfig as { systemPromptId?: string }).systemPromptId
    await svc.from('bots').update({ config: nextConfig }).eq('id', b.id)
  }
  revalidatePath('/owner/prompts')
}
