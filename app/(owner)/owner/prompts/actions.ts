'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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

/**
 * Saves the DRAFT only. No bot is affected — bots run pinned published
 * versions; use publishSystemPrompt to make an edit selectable.
 */
export async function updateSystemPrompt(id: string, name: string, content: string): Promise<void> {
  await requireRole('owner')
  const fields = clean(name, content)
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('system_prompts')
    .update({ name: fields.name, content: fields.content })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/owner/prompts')
}

/**
 * Freeze the current draft as the next immutable version. Publishing makes the
 * version selectable in every bot's Live/Preview dropdowns — nothing
 * auto-applies; bots stay pinned until someone changes their dropdown.
 */
export async function publishSystemPrompt(id: string, note?: string): Promise<void> {
  await requireRole('owner')
  const supabase = await createServerClient()
  const { data: prompt, error: loadError } = await supabase
    .from('system_prompts')
    .select('id, content')
    .eq('id', id)
    .single()
  if (loadError || !prompt) throw new Error('Prompt not found.')
  if (!prompt.content.trim()) throw new Error('Cannot publish an empty prompt.')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: latest } = await supabase
    .from('system_prompt_versions')
    .select('version, content')
    .eq('prompt_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latest && latest.content === prompt.content) {
    throw new Error(`No changes since v${latest.version} — edit the draft first.`)
  }

  const { error } = await supabase.from('system_prompt_versions').insert({
    prompt_id: id,
    version: (latest?.version ?? 0) + 1,
    content: prompt.content,
    note: note?.trim() || null,
    published_by: user?.id ?? null,
  })
  // unique (prompt_id, version) turns a double-publish race into a clean error.
  if (error) throw new Error(error.message)
  revalidatePath('/owner/prompts')
}

export async function deleteSystemPrompt(id: string): Promise<void> {
  await requireRole('owner')
  const supabase = await createServerClient()
  const { error } = await supabase.from('system_prompts').delete().eq('id', id)
  if (error) throw new Error(error.message)

  // Versions cascade away; bots keep their current prompt text (the snapshot).
  // Drop the now-dangling references so they show as "custom" rather than
  // pointing at deleted rows.
  const svc = createServiceClient()
  const { data } = await svc
    .from('bots')
    .select('id, config')
    .eq('config->>systemPromptId', id)
    .returns<Pick<Bot, 'id' | 'config'>[]>()
  for (const b of data ?? []) {
    const nextConfig = { ...b.config }
    delete nextConfig.systemPromptId
    delete nextConfig.systemPromptVersionId
    delete nextConfig.previewSystemPromptVersionId
    await svc.from('bots').update({ config: nextConfig }).eq('id', b.id)
  }
  revalidatePath('/owner/prompts')
}
