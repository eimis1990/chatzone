import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { SystemPromptsManager, type VersionUsage } from '@/components/owner/SystemPromptsManager'
import type { SystemPrompt, SystemPromptVersion } from '@/lib/types'

/**
 * Owner prompt library — create/name reusable system prompts (e.g. "E-commerce",
 * "Default") once and assign them to client bots from the config dropdown.
 * Editing saves a draft; publishing freezes an immutable version that bots pin
 * via config.systemPromptVersionId. Nothing auto-applies.
 */
export default async function PromptsPage() {
  await requireRole('owner')
  const supabase = await createServerClient()

  const [{ data: prompts }, { data: versions }, { data: bots }] = await Promise.all([
    supabase
      .from('system_prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<SystemPrompt[]>(),
    supabase
      .from('system_prompt_versions')
      .select('*')
      .order('version', { ascending: false })
      .returns<SystemPromptVersion[]>(),
    supabase.from('bots').select('id, name, config, organizations(name)'),
  ])

  // Usage per prompt family and per pinned version.
  const usage: Record<string, number> = {}
  const versionUsage: Record<string, VersionUsage[]> = {}
  for (const b of bots ?? []) {
    const cfg = b.config as {
      systemPromptId?: string
      systemPromptVersionId?: string
    } | null
    if (!cfg?.systemPromptId) continue
    usage[cfg.systemPromptId] = (usage[cfg.systemPromptId] ?? 0) + 1
    // supabase-js types the to-one relation as an array; runtime gives an object.
    const rel = b.organizations as { name: string } | { name: string }[] | null
    const org = (Array.isArray(rel) ? rel[0]?.name : rel?.name) ?? '—'
    const key = cfg.systemPromptVersionId ?? `unversioned:${cfg.systemPromptId}`
    ;(versionUsage[key] ??= []).push({ botName: b.name as string, orgName: org })
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">System prompts</h1>
        <p className="text-sm text-muted-foreground">
          Edit drafts freely — nothing changes for bots until you publish a version, and even then
          each bot keeps its pinned version until someone selects the new one.
        </p>
      </div>
      <SystemPromptsManager
        prompts={prompts ?? []}
        versions={versions ?? []}
        usage={usage}
        versionUsage={versionUsage}
      />
    </div>
  )
}
