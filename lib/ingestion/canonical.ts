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
    // Both platform languages, each under its own heading: the heading-aware
    // chunker then indexes each section separately, so a Lithuanian question
    // lexically matches the Lithuanian section (an English-only summary used to
    // lose the FTS channel entirely for LT visitors, and vice versa).
    'Write the summary TWICE — the same facts in both languages:\n' +
    'first a Lithuanian section starting with the exact heading line "## Santrauka (LT)",\n' +
    'then an English section starting with the exact heading line "## Summary (EN)".\n' +
    'Translate faithfully; numbers, prices, emails, phone numbers, and addresses stay identical in ' +
    'both sections. Use short paragraphs and bullet points where helpful. No other title.\n\n' +
    // Chunk-retrieval cares about what leads the section: visitors ask "kada
    // dirbate?", not "koks įmonės kodas?" — a rekvizitai-first contact page once
    // pushed the working hours out of the retrieved window.
    'Within each section, order the facts by how often customers ask for them — the everyday ' +
    'answers first (working hours, address, contact channels, prices, timeframes, steps), and ' +
    'legal/company-registration details (company code, VAT, legal entity) LAST.\n\n' +
    // Lithuanian sites write hours as "I–V 09:00–17:00, VI 11:00–16:00". Neither
    // search channel links "ar dirbate sekmadienį?" to "VII", so the hours chunk
    // was never retrieved for day-name questions (HomeByNB, 2026-11-12).
    // Deliberately NOT "list the omitted days as closed": tried it, and the
    // model wrote "Sekmadienis: nedirbame" next to real Sunday hours.
    'Opening hours: include them ONLY when the excerpts state them with clock times, and then ' +
    "write each day or day range with FULL weekday names in each section's language, expanding " +
    'shorthand such as I–V, VI, VII, Pr–Pn or Mon–Fri (I = Monday … VII = Sunday). Keep any ' +
    'date limit on temporary hours exactly as stated. If the excerpts only say something like ' +
    '"darbo dienomis" or "during business hours", repeat that phrase as it is — never turn it ' +
    'into a schedule, and never add a day, a time, or a "closed" note the excerpts do not state. ' +
    'Leave out anything the excerpts do not cover; never write that something is not specified.\n\n' +
    `Excerpts:\n${excerpts}`
  )
}

/**
 * Clock times and "closed" claims in a summary that its excerpts never state.
 * The prompt alone does not hold: on a live bot gpt-4o-mini turned "susisiekite
 * darbo valandomis" into "Mon–Fri 9:00–17:00, Sat–Sun closed" (2026-11-12),
 * and summaries outrank the real sources in search.
 * ponytail: colon times only ("9.00" is indistinguishable from a price), and
 * only the Lithuanian section — the English one may say "5:00 PM".
 */
export function ungroundedHours(content: string, excerpts: string): string[] {
  const times = (s: string) =>
    new Set([...s.matchAll(/\b\d{1,2}:\d{2}\b/g)].map((m) => m[0].replace(/^0/, '')))
  const known = times(excerpts)
  const bad = [...times(content.split('## Summary (EN)')[0])].filter((t) => !known.has(t))
  const closed = /nedirb|\bclosed\b/i
  if (closed.test(content) && !closed.test(excerpts)) bad.push('closed')
  return bad
}

/**
 * Drops "not specified" lines. Asked to lead with working hours, the model
 * writes "Darbo valandos: nenurodytos" on pages whose excerpts have none — and
 * that line, in a boosted summary, sits next to the real hours at answer time.
 */
export function dropAbsenceLines(content: string): string {
  const absent = /nenurodyt|nėra (pateikt|nurodyt)|not (specified|provided|stated|available)/i
  return content
    .split('\n')
    .filter((line) => !absent.test(line))
    .join('\n')
}

const ROMAN_DAYS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
const LT_DAYS = ['Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis', 'Sekmadienis']
const EN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * "I – V 09:00 – 17:00" → "Pirmadienis–Penktadienis 09:00 – 17:00". The prompt
 * asks for full weekday names, but the model skips it about one run in three —
 * and without the names no day-name question finds the hours. Only a numeral
 * (or range) directly in front of a clock time is touched.
 */
export function expandRomanWeekdays(content: string): string {
  const expand = (text: string, days: string[]) =>
    text.replace(
      /(^|[\s*(])(VII|VI|IV|V|III|II|I)(?:\s*[–—-]\s*(VII|VI|IV|V|III|II|I))?(?=[\s:*]*\d{1,2}[:.]\d{2})/gm,
      (_m, pre: string, from: string, to?: string) =>
        pre + days[ROMAN_DAYS.indexOf(from)] + (to ? `–${days[ROMAN_DAYS.indexOf(to)]}` : ''),
    )
  const at = content.indexOf('## Summary (EN)')
  return at < 0 ? expand(content, LT_DAYS) : expand(content.slice(0, at), LT_DAYS) + expand(content.slice(at), EN_DAYS)
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
      const prompt = buildPrompt(topic, excerpts)
      const write = async () => dropAbsenceLines(expandRomanWeekdays((await synthesize(prompt)).trim()))
      content = await write()
      // Invented hours: one more try, then keep the page that is already there.
      if (ungroundedHours(content, excerpts).length) content = await write()
      if (ungroundedHours(content, excerpts).length) {
        skipped++
        continue
      }
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
