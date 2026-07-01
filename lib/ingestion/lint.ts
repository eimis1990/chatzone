import type { SupabaseClient } from '@supabase/supabase-js'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { LintFinding, LintSeverity } from '@/lib/types'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { CANONICAL_TOPICS, CANONICAL_KIND } from './canonical'

/**
 * Knowledge-base "lint" — the maintenance half of the LLM-wiki idea. It audits a
 * bot's OWN crawled content, topic by topic, for quality issues a human should
 * fix: contradictions (two pages stating incompatible facts — different return
 * windows, phone numbers, prices), stale content (expired dates/promos), and
 * gaps (a common topic with no content). Grounded strictly in the excerpts and
 * deliberately conservative, so the owner gets signal, not noise.
 */

const SUPPORT_CHUNKS = 8
const RETRIEVE_K = 14
const MIN_SUPPORT_SIMILARITY = 0.15
const MAX_FINDINGS = 40

const analysisSchema = z.object({
  findings: z.array(
    z.object({
      type: z.enum(['contradiction', 'stale']),
      severity: z.enum(['high', 'medium', 'low']),
      summary: z.string(),
      detail: z.string(),
      evidence: z.array(z.string()),
    }),
  ),
})

function buildPrompt(topic: string, excerpts: string): string {
  return (
    `You are auditing an online store's knowledge base for QUALITY ISSUES. All excerpts below relate ` +
    `to "${topic}".\n\n` +
    'Report ONLY:\n' +
    '1) CONTRADICTIONS — two excerpts stating genuinely incompatible facts about the SAME thing ' +
    '(e.g. different return windows, different phone numbers or emails, different prices, thresholds, ' +
    'or timeframes). Put BOTH conflicting statements, quoted verbatim, in "evidence".\n' +
    '2) STALE content — explicit past dates or years, expired promotions, or "coming soon" / ' +
    '"temporarily" notes that appear outdated. Quote the stale text in "evidence".\n\n' +
    'STRICT RULES:\n' +
    '- A contradiction requires TWO excerpts that BOTH make a claim about the same specific fact, and ' +
    'those claims are mutually incompatible (e.g. "14 days" vs "30 days"). If one excerpt states a fact ' +
    'and another is simply SILENT, less specific, or more general about it, that is NOT a contradiction — ' +
    'do not report it.\n' +
    '- The SAME fact written in two languages is NOT a contradiction. Ignore language differences.\n' +
    '- Do NOT flag minor wording, formatting, or ordering differences.\n' +
    '- Do NOT invent issues. If the excerpts are consistent and current, return an empty findings list.\n' +
    '- Only report high-confidence issues a store owner would genuinely want to fix.\n' +
    '- "summary" is one short line; "detail" explains the issue; keep each evidence quote under 200 chars.\n\n' +
    `Excerpts:\n${excerpts}`
  )
}

interface LintDeps {
  /** Injectable for tests; defaults to gpt-4o-mini via the AI SDK. */
  analyze?: (topic: string, excerpts: string) => Promise<Omit<LintFinding, 'topic'>[]>
}

async function defaultAnalyze(topic: string, excerpts: string): Promise<Omit<LintFinding, 'topic'>[]> {
  const { object } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0.1,
    schema: analysisSchema,
    prompt: buildPrompt(topic, excerpts),
  })
  return object.findings.map((f) => ({
    type: f.type,
    severity: f.severity,
    summary: f.summary,
    detail: f.detail,
    evidence: (f.evidence ?? []).slice(0, 4),
  }))
}

const SEVERITY_RANK: Record<LintSeverity, number> = { high: 0, medium: 1, low: 2 }

export interface LintResult {
  findings: LintFinding[]
  /** How many topics were actually scanned (had content). */
  scanned: number
}

/**
 * Scans a bot's knowledge base for contradictions, stale content, and gaps.
 * Read-only — surfaces issues for the owner to fix; makes no changes.
 */
export async function generateKbLint(
  botId: string,
  db: SupabaseClient,
  deps: LintDeps = {},
): Promise<LintResult> {
  const analyze = deps.analyze ?? defaultAnalyze
  const retrieval = serviceRetrievalDeps(db)

  // Lint the RAW content, not our own synthesized canonical pages.
  const { data: canonRows } = await db
    .from('knowledge_sources')
    .select('id')
    .eq('bot_id', botId)
    .eq('metadata->>kind', CANONICAL_KIND)
  const canonicalIds = new Set((canonRows ?? []).map((r) => r.id as string))

  const findings: LintFinding[] = []
  let scanned = 0

  for (const topic of CANONICAL_TOPICS) {
    const { matched } = await retrieveContext(
      botId,
      topic.query,
      { k: RETRIEVE_K, minSimilarity: MIN_SUPPORT_SIMILARITY },
      retrieval,
    )
    const support = matched.filter((m) => !canonicalIds.has(m.source_id)).slice(0, SUPPORT_CHUNKS)

    if (support.length === 0) {
      findings.push({
        type: 'gap',
        severity: 'low',
        topic: topic.title,
        summary: `No “${topic.title}” information found`,
        detail: `Customers often ask about ${topic.title.toLowerCase()}, but the knowledge base has no content on it. Consider adding a page, a Q&A, or crawling the relevant page.`,
        evidence: [],
      })
      continue
    }

    scanned++
    const excerpts = support.map((m, i) => `[${i + 1}] ${m.content}`).join('\n\n')
    try {
      const topicFindings = await analyze(topic.title, excerpts)
      for (const f of topicFindings) findings.push({ ...f, topic: topic.title })
    } catch {
      // A failed topic analysis is non-fatal — keep scanning the rest.
    }
  }

  findings.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
  return { findings: findings.slice(0, MAX_FINDINGS), scanned }
}
