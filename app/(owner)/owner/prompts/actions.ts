'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncVoiceAgent } from '@/lib/ai/elevenlabs-agent'
import type { Bot } from '@/lib/types'

const nameSchema = z.string().trim().min(1).max(120)
const contentSchema = z.string().max(8000)

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
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { error } = await supabase.from('system_prompts').insert({
    name: nameSchema.parse(name),
    content: contentSchema.parse(content),
    created_by: user?.id ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/owner/prompts')
}

export async function updateSystemPrompt(id: string, name: string, content: string): Promise<void> {
  await requireRole('owner')
  const parsedContent = contentSchema.parse(content)
  const supabase = await createServerClient()
  const { error } = await supabase
    .from('system_prompts')
    .update({ name: nameSchema.parse(name), content: parsedContent })
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
