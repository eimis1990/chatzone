import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { SystemPromptsManager } from '@/components/owner/SystemPromptsManager'
import type { SystemPrompt } from '@/lib/types'

/**
 * Owner prompt library — create/name reusable system prompts (e.g. "E-commerce",
 * "Default") once and assign them to client bots from the config dropdown, rather
 * than copy-pasting a prompt into every bot.
 */
export default async function PromptsPage() {
  await requireRole('owner')
  const supabase = await createServerClient()

  const [{ data: prompts }, { data: bots }] = await Promise.all([
    supabase
      .from('system_prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<SystemPrompt[]>(),
    supabase.from('bots').select('config'),
  ])

  // Usage per prompt = how many bots reference it via config.systemPromptId.
  const usage: Record<string, number> = {}
  for (const b of bots ?? []) {
    const id = (b.config as { systemPromptId?: string } | null)?.systemPromptId
    if (id) usage[id] = (usage[id] ?? 0) + 1
  }

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold">System prompts</h1>
        <p className="text-sm text-muted-foreground">
          Create reusable prompts once and assign them to any bot from its configuration — no more
          copy-pasting. Markdown is supported and rendered when you preview.
        </p>
      </div>
      <SystemPromptsManager prompts={prompts ?? []} usage={usage} />
    </div>
  )
}
