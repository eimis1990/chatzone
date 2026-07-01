import type { SupabaseClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'

/**
 * Canonical "answer summary" pages — a light take on Karpathy's LLM-wiki idea.
 * Instead of the bot rediscovering scattered facts on every query, we synthesize
 * a clean, authoritative page per common support topic from the store's OWN
 * crawled content, and embed it alongside the raw chunks. This lifts answer
 * quality on the questions customers actually ask (returns, shipping, contact…)
 * without the cost of maintaining a full wiki.
 *
 * A page is only written when the KB genuinely contains the info — synthesis is
 * grounded strictly in retrieved excerpts and yields "NONE" otherwise, so we
 * never invent a policy, price, or contact detail.
 */

export const CANONICAL_KIND = 'canonical'

export interface CanonicalTopic {
  key: string
  /** Human title (used as the source name + shown in the UI). */
  title: string
  /** Bilingual retrieval query (EN + LT) to gather the topic's chunks. */
  query: string
}

// High-value support topics. Queries are bilingual so retrieval finds the
// content whatever language the store is in.
export const CANONICAL_TOPICS: CanonicalTopic[] = [
  {
    key: 'returns',
    title: 'Returns & refunds',
    query:
      'returns refunds exchanges return policy money back how to return an item ' +
      'grąžinimas grąžinimai pinigų grąžinimas prekių keitimas kaip grąžinti prekę atsisakymas',
  },
  {
    key: 'shipping',
    title: 'Shipping & delivery',
    query:
      'shipping delivery dispatch times delivery cost couriers free shipping when will I get it ' +
      'pristatymas siuntimas pristatymo laikas pristatymo kaina kurjeris nemokamas pristatymas kada gausiu',
  },
  {
    key: 'payment',
    title: 'Payment methods',
    query:
      'payment methods how to pay card bank transfer installments invoice ' +
      'apmokėjimas mokėjimo būdai kaip sumokėti kortele bankinis pavedimas išsimokėtinai sąskaita faktūra',
  },
  {
    key: 'contact',
    title: 'Contact & business details',
    query:
      'contact us email phone number address working hours company details customer support ' +
      'kontaktai susisiekite el. paštas telefonas adresas darbo laikas įmonės rekvizitai klientų aptarnavimas',
  },
  {
    key: 'warranty',
    title: 'Warranty & guarantees',
    query:
      'warranty guarantee faulty defective item repair quality guarantee period ' +
      'garantija kokybės garantija sugedusi bloga prekė remontas garantinis laikotarpis',
  },
  {
    key: 'ordering',
    title: 'Ordering & account',
    query:
      'how to place an order order process checkout account registration order confirmation ' +
      'kaip užsakyti užsakymo eiga apmokėjimo krepšelis paskyra registracija užsakymo patvirtinimas',
  },
]

// How many supporting chunks to feed the synthesizer, and how many to fetch
// before filtering out any prior canonical pages.
const SUPPORT_CHUNKS = 8
const RETRIEVE_K = 14
const MIN_SUPPORT_SIMILARITY = 0.15

function buildPrompt(topic: CanonicalTopic, excerpts: string): string {
  return (
    `You are compiling a concise, canonical help page about "${topic.title}" for an online store — ` +
    'it will be used by the store\'s support chatbot to answer customers.\n\n' +
    'Using ONLY the excerpts below, write a clear summary of everything the store states about this ' +
    'topic: policies, timeframes, costs, steps, conditions, and any contact details. Preserve specific ' +
    'numbers, prices, emails, phone numbers, and dates EXACTLY as written. Do NOT invent, assume, or ' +
    'generalise anything that is not in the excerpts.\n\n' +
    'If the excerpts contain no relevant information about this topic, reply with exactly: NONE\n\n' +
    'Write in the SAME language as the excerpts. Use short paragraphs and bullet points where helpful. ' +
    'Do not add a heading or title.\n\n' +
    `Excerpts:\n${excerpts}`
  )
}

interface CanonicalDeps {
  /** Injectable for tests; defaults to gpt-4o-mini via the AI SDK. */
  synthesize?: (prompt: string) => Promise<string>
}

async function defaultSynthesize(prompt: string): Promise<string> {
  const { text } = await generateText({ model: openai('gpt-4o-mini'), temperature: 0.2, prompt })
  return text
}

export interface CanonicalResult {
  built: number
  skipped: number
  removed: number
}

/**
 * Regenerates the canonical pages for a bot from its current knowledge base.
 * Idempotent: updates existing canonical sources in place, creates missing ones,
 * and removes those a topic no longer has support for. Manual edits (persisted as
 * metadata.contentOverride via the source drawer) are preserved.
 */
export async function generateCanonicalPages(
  botId: string,
  db: SupabaseClient,
  deps: CanonicalDeps = {},
): Promise<CanonicalResult> {
  const synthesize = deps.synthesize ?? defaultSynthesize
  const retrieval = serviceRetrievalDeps(db)
  const repo = makeServiceRepo(db)

  // Existing canonical pages: excluded from retrieval (no self-reference) and
  // reused as the upsert target per topic.
  const { data: canonRows } = await db
    .from('knowledge_sources')
    .select('id, metadata')
    .eq('bot_id', botId)
    .eq('metadata->>kind', CANONICAL_KIND)
  const canonicalIds = new Set((canonRows ?? []).map((r) => r.id as string))
  const existingByTopic = new Map<string, { id: string; metadata: Record<string, unknown> }>()
  for (const r of canonRows ?? []) {
    const meta = (r.metadata ?? {}) as Record<string, unknown>
    const topic = meta.topic
    if (typeof topic === 'string') existingByTopic.set(topic, { id: r.id as string, metadata: meta })
  }

  let built = 0
  let skipped = 0
  let removed = 0

  for (const topic of CANONICAL_TOPICS) {
    const existing = existingByTopic.get(topic.key)
    const override =
      existing && typeof existing.metadata.contentOverride === 'string'
        ? (existing.metadata.contentOverride as string)
        : null

    const { matched } = await retrieveContext(
      botId,
      topic.query,
      { k: RETRIEVE_K, minSimilarity: MIN_SUPPORT_SIMILARITY },
      retrieval,
    )
    const support = matched.filter((m) => !canonicalIds.has(m.source_id)).slice(0, SUPPORT_CHUNKS)

    // No supporting content for this topic.
    if (support.length === 0) {
      if (existing && override) {
        // Owner authored it by hand — keep it, just make sure it's indexed.
        await ingestSource(existing.id, { repo })
      } else if (existing) {
        await db.from('knowledge_sources').delete().eq('id', existing.id)
        removed++
      } else {
        skipped++
      }
      continue
    }

    const excerpts = support.map((m, i) => `[${i + 1}] ${m.content}`).join('\n\n')
    let content = ''
    try {
      content = (await synthesize(buildPrompt(topic, excerpts))).trim()
    } catch {
      skipped++
      continue
    }

    const usable = content && content.toUpperCase() !== 'NONE' && content.length >= 20
    if (!usable) {
      if (existing && override) {
        await ingestSource(existing.id, { repo })
      } else if (existing) {
        await db.from('knowledge_sources').delete().eq('id', existing.id)
        removed++
      } else {
        skipped++
      }
      continue
    }

    const name = `Summary: ${topic.title}`
    const metadata: Record<string, unknown> = {
      kind: CANONICAL_KIND,
      topic: topic.key,
      topicTitle: topic.title,
      content,
    }
    // Preserve a manual edit so regeneration never clobbers curated wording.
    if (override) metadata.contentOverride = override

    let sourceId = existing?.id
    if (sourceId) {
      await db
        .from('knowledge_sources')
        .update({ name, status: 'pending', error_message: null, metadata })
        .eq('id', sourceId)
    } else {
      const { data: ins } = await db
        .from('knowledge_sources')
        .insert({ bot_id: botId, type: 'text', name, status: 'pending', metadata })
        .select('id')
        .single<{ id: string }>()
      sourceId = ins?.id
    }
    if (sourceId) {
      await ingestSource(sourceId, { repo })
      built++
    }
  }

  return { built, skipped, removed }
}
