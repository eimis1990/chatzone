import { NextResponse } from 'next/server'
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import { createRateLimiter } from '@/lib/ratelimit'
import type { KnowledgeSource } from '@/lib/types'

// One LLM edit + re-index per affected source — give it room.
export const maxDuration = 180

const bodySchema = z.object({
  botId: z.string().uuid(),
  sourceIds: z.array(z.string().uuid()).min(1).max(8),
  instruction: z.string().min(1).max(1000),
  fingerprint: z.string().min(1).max(64),
})

// A few LLM-backed resolutions per minute per user.
const limiter = createRateLimiter({ capacity: 3, refillPerSec: 0.05 })

const editsSchema = z.object({
  edits: z.array(z.object({ find: z.string(), replace: z.string() })),
})

/** Ask the model for minimal verbatim find/replace edits (safer than
 *  regenerating a whole — possibly large — document, which can silently drop
 *  content). We apply them in code and only where `find` actually matches. */
async function proposeEdits(doc: string, instruction: string): Promise<{ find: string; replace: string }[]> {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0,
    schema: editsSchema,
    prompt:
      "You are correcting a store's knowledge-base document. Apply ONLY the correction below and " +
      'change nothing else.\n\n' +
      `Correction: ${instruction}\n\n` +
      'Return a minimal list of find/replace edits. Each "find" MUST be an exact substring copied ' +
      'verbatim from the document, long enough to be unique; "replace" is the corrected text. Do not ' +
      'reformat or touch unrelated content. If this document needs no change, return an empty list.\n\n' +
      `Document:\n${doc}`,
  })
  return object.edits
}

/** Apply verbatim find/replace edits (first occurrence each). Returns the new
 *  text and how many edits actually matched. */
function applyEdits(doc: string, edits: { find: string; replace: string }[]): { text: string; applied: number } {
  let text = doc
  let applied = 0
  for (const { find, replace } of edits) {
    if (find && text.includes(find)) {
      text = text.replace(find, replace)
      applied++
    }
  }
  return { text, applied }
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { botId, sourceIds, instruction, fingerprint } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Please wait a moment before resolving again.' }, { status: 429 })
  }

  // RLS: only sources the user can see, scoped to this bot.
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', botId)
    .in('id', sourceIds)
    .returns<KnowledgeSource[]>()
  if (!sources || sources.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  let edited = 0
  try {
    for (const source of sources) {
      // Base text = the indexed chunks joined (what the source drawer edits).
      const { data: chunks } = await svc
        .from('document_chunks')
        .select('content')
        .eq('source_id', source.id)
        .order('chunk_index', { ascending: true })
      const doc = ((chunks ?? []) as { content: string }[]).map((c) => c.content).join('\n\n')
      if (!doc.trim()) continue

      const { text, applied } = applyEdits(doc, await proposeEdits(doc, instruction))
      if (applied === 0 || text === doc) continue

      const meta = { ...((source.metadata ?? {}) as Record<string, unknown>), contentOverride: text }
      await svc
        .from('knowledge_sources')
        .update({ metadata: meta, status: 'pending', error_message: null })
        .eq('id', source.id)
      await ingestSource(source.id, { repo: makeServiceRepo(svc) })
      edited++
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Resolve failed' },
      { status: 502 },
    )
  }

  // Mark the finding resolved so it doesn't reappear (RLS-scoped write).
  await supabase
    .from('knowledge_lint_dismissals')
    .upsert({ bot_id: botId, fingerprint, created_by: user.id }, { onConflict: 'bot_id,fingerprint' })

  return NextResponse.json({ ok: true, edited })
}
