# Agent Quality Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the chat + voice agent consistent and better-than-Parnidia on homebynb.lt: stronger model, working Lithuanian retrieval, hybrid product search, voice/text parity, visible failures, measurable evals.

**Architecture:** Next.js App Router + Supabase (pgvector, FTS, RPCs) + Vercel AI SDK (`ai` v6 + `@ai-sdk/openai`). Retrieval is hybrid (vector+FTS+RRF) via SQL functions; product search mirrors that pattern. All chat flows through `app/api/chat/route.ts` → `ndjsonChatResponse`.

**Tech Stack:** TypeScript, Zod, Vitest (`npm test` — the npm wrapper is REQUIRED; bare `npx vitest` fails on Node 22.9 with ERR_REQUIRE_ESM), Supabase migrations, plain `.mjs` scripts for evals.

## Global Constraints

- Run tests only via `npm test` (project memory: Node 22.9 needs the require-esm flag).
- Spec: `docs/superpowers/specs/2026-07-02-agent-quality-sprint-design.md`.
- Default chat model: `gpt-4.1`. Side-task model stays `gpt-4o-mini` (enrich/canonical/lint/conversation-intel — do NOT touch those call sites).
- Default voice LLM: `gpt-4o` (must stay within `VOICE_LLM_OPTIONS` — ElevenLabs rejects unknown ids with a 400).
- FTS config for both chunks and products: `'simple'` (Lithuanian-safe; no English stemming).
- New migrations are `0028_fts_simple.sql` and `0029_product_hybrid.sql` (0027 is taken).
- Commit after every task; commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Centralize and upgrade the default chat model

**Files:**
- Create: `lib/ai/chat-models.ts`
- Modify: `lib/validation/schemas.ts:146-147`, `app/api/chat/route.ts:187-188`, `app/api/preview/chat/route.ts:63`, `components/client/TestChat.tsx:428`
- Create: `scripts/upgrade-bot-models.mjs`
- Test: `tests/unit/botConfig.test.ts`

**Interfaces:**
- Produces: `DEFAULT_CHAT_MODEL: string`, `DEFAULT_TEMPERATURE: number`, `CHAT_MODEL_OPTIONS: {value,label}[]` from `@/lib/ai/chat-models`. Later tasks import `DEFAULT_CHAT_MODEL` anywhere `'gpt-4o-mini'` was a chat default.

- [ ] **Step 1: Write the failing test** — add to `tests/unit/botConfig.test.ts`:

```ts
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'

it('defaults new bot configs to the strong chat model', () => {
  const cfg = botConfigSchema.parse(minimalConfig()) // reuse the existing minimal fixture in this file
  expect(cfg.model).toBe(DEFAULT_CHAT_MODEL)
  expect(DEFAULT_CHAT_MODEL).toBe('gpt-4.1')
  expect(cfg.temperature).toBe(DEFAULT_TEMPERATURE)
})
```

- [ ] **Step 2: Run `npm test -- botConfig` — expect FAIL** (module not found).

- [ ] **Step 3: Create `lib/ai/chat-models.ts`:**

```ts
/**
 * Chat LLM used for visitor-facing conversations (text widget + preview).
 * gpt-4o-mini was too weak for the 14-step commerce tool loop in Lithuanian —
 * inconsistent answers, missed tool calls. Side tasks (tag enrichment, canonical
 * pages, lint, conversation intel) intentionally stay on gpt-4o-mini for cost.
 */
export const DEFAULT_CHAT_MODEL = 'gpt-4.1'

/** Lower default than before (0.3) — consistency beats variety for support. */
export const DEFAULT_TEMPERATURE = 0.2

export interface ChatModelOption {
  value: string
  label: string
}

export const CHAT_MODEL_OPTIONS: ChatModelOption[] = [
  { value: 'gpt-4.1', label: 'GPT-4.1 — best quality (default)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o mini — cheapest' },
]
```

- [ ] **Step 4: Replace the defaults at every chat call site.**
  - `lib/validation/schemas.ts`: import the constants; `model: z.string().default(DEFAULT_CHAT_MODEL)`, `temperature: ...default(DEFAULT_TEMPERATURE)`.
  - `app/api/chat/route.ts:187`: `openai(bot.config.model || DEFAULT_CHAT_MODEL)` and `temperature: bot.config.temperature ?? DEFAULT_TEMPERATURE`.
  - `app/api/preview/chat/route.ts:63`: same substitution.
  - `components/client/TestChat.tsx:428`: `model: config.model ?? DEFAULT_CHAT_MODEL`.
  - Do NOT touch `lib/ingestion/*`, `lib/products/enrich.ts`, `lib/ai/conversation-intel.ts`, or `app/api/llm/[publicKey]/route.ts` (voice LLM proxy — ElevenLabs-constrained, handled in Task 2).

- [ ] **Step 5: Create `scripts/upgrade-bot-models.mjs`** (existing bot configs have `gpt-4o-mini` literally saved by the old schema default):

```js
// One-off: bump bots still on the old default chat model to the new default.
// Usage: node scripts/upgrade-bot-models.mjs [--dry]
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
const dry = process.argv.includes('--dry')
const db = createClient(url, key)

const { data: bots, error } = await db.from('bots').select('id, name, config')
if (error) throw error
let changed = 0
for (const bot of bots ?? []) {
  if (bot.config?.model !== 'gpt-4o-mini') continue
  changed++
  console.log(`${dry ? '[dry] ' : ''}${bot.name} (${bot.id}): gpt-4o-mini -> gpt-4.1`)
  if (!dry) {
    const { error: up } = await db
      .from('bots')
      .update({ config: { ...bot.config, model: 'gpt-4.1' } })
      .eq('id', bot.id)
    if (up) throw up
  }
}
console.log(`${changed} bot(s) ${dry ? 'would be' : ''} updated`)
```

- [ ] **Step 6: Run `npm test` — expect PASS (full suite).**

- [ ] **Step 7: Commit** — `feat(ai): upgrade default chat model to gpt-4.1, centralize model constants`.

---

### Task 2: Upgrade the default voice LLM

**Files:**
- Modify: `lib/ai/voice-models.ts:15-23`, `lib/validation/schemas.ts:185,192`, `lib/ai/elevenlabs-agent.ts:173`
- Test: `tests/unit/voice.test.ts` or `tests/unit/elevenlabs-agent.test.ts` (whichever asserts the default)

- [ ] **Step 1: Failing test** — assert `DEFAULT_VOICE_LLM === 'gpt-4o'` and that a config without `voice.llmModel` resolves to `'gpt-4o'` in the agent payload (extend the existing elevenlabs-agent test that builds the agent config).

- [ ] **Step 2:** `lib/ai/voice-models.ts`: `DEFAULT_VOICE_LLM = 'gpt-4o'`; reorder options so gpt-4o is first with label `'GPT-4o — best quality (default)'`, gpt-4o-mini second `'GPT-4o mini — fastest'`. Keep the value list unchanged otherwise (ElevenLabs enum).

- [ ] **Step 3:** `lib/validation/schemas.ts`: `llmModel: z.string().default(DEFAULT_VOICE_LLM)` (import it); update the object-level `.default({...llmModel: DEFAULT_VOICE_LLM})`. `lib/ai/elevenlabs-agent.ts:173`: replace the `?? 'gpt-4o-mini'` literal with `?? DEFAULT_VOICE_LLM`.

- [ ] **Step 4: `npm test` — PASS. Commit** — `feat(voice): default voice LLM to gpt-4o`.

---

### Task 3: Lithuanian-safe FTS (migration 0028)

**Files:**
- Create: `supabase/migrations/0028_fts_simple.sql`

**Interfaces:**
- Produces: same `match_chunks_hybrid` signature (no TS changes needed).

- [ ] **Step 1: Write the migration:**

```sql
-- ============================================================================
-- Lithuanian-safe FTS. Migration 0020 hardcoded the 'english' tsvector config,
-- which stems/stopwords English only — Lithuanian morphology never matched, so
-- LT queries effectively lost the lexical half of hybrid retrieval. 'simple'
-- lowercases and splits without language-specific stemming: exact lexemes
-- (Lithuanian words, emails, product names) match in every language, and the
-- vector channel keeps carrying semantics. Net win for a Lithuanian-first corpus.
-- ============================================================================

drop index if exists idx_document_chunks_content_fts;
create index idx_document_chunks_content_fts
  on public.document_chunks
  using gin (to_tsvector('simple', coalesce(content, '')));

create or replace function public.match_chunks_hybrid(
  p_bot_id          uuid,
  p_query_embedding vector(1536),
  p_query_text      text,
  p_match_count     int   default 5,
  p_min_similarity  float default 0.2,
  p_vector_count    int   default 30,
  p_fts_count       int   default 30
)
returns table (id uuid, content text, source_id uuid, similarity float, rrf_score float)
language sql stable as $$
  with vec as (
    select
      dc.id, dc.content, dc.source_id,
      1 - (dc.embedding <=> p_query_embedding) as similarity,
      row_number() over (order by dc.embedding <=> p_query_embedding asc) as rank
    from public.document_chunks dc
    where dc.bot_id = p_bot_id and dc.embedding is not null
    order by dc.embedding <=> p_query_embedding asc
    limit p_vector_count
  ),
  fts as (
    select
      dc.id,
      row_number() over (
        order by ts_rank_cd(
          to_tsvector('simple', coalesce(dc.content, '')),
          websearch_to_tsquery('simple', p_query_text)
        ) desc
      ) as rank
    from public.document_chunks dc
    where dc.bot_id = p_bot_id
      and p_query_text is not null
      and websearch_to_tsquery('simple', p_query_text) @@
          to_tsvector('simple', coalesce(dc.content, ''))
    limit p_fts_count
  ),
  fused as (
    select
      coalesce(v.id, f.id) as id,
      v.similarity,
      f.rank as fts_rank,
      coalesce(1.0 / (60 + v.rank), 0.0) +
      coalesce(1.0 / (60 + f.rank), 0.0) as rrf_score
    from vec v
    full outer join fts f on f.id = v.id
  )
  select
    dc.id, dc.content, dc.source_id,
    coalesce(fu.similarity, 1 - (dc.embedding <=> p_query_embedding))::float as similarity,
    fu.rrf_score::float
  from fused fu
  join public.document_chunks dc on dc.id = fu.id
  where fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.rrf_score desc, similarity desc
  limit greatest(p_match_count, 1);
$$;
```

(Grant from 0020 persists across `create or replace`; no re-grant needed.)

- [ ] **Step 2: Baseline BEFORE applying:** `node scripts/eval-retrieval.mjs` (needs `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` from `.env.local`). Record recall@5 numbers.

- [ ] **Step 3: Apply the migration** to the linked project (`npx supabase db push`, or paste into the Supabase SQL editor — match however 0027 was applied).

- [ ] **Step 4: Re-run `node scripts/eval-retrieval.mjs`** — hybrid recall must be ≥ baseline. Add 2-3 Lithuanian morphology cases to `scripts/retrieval-eval-cases.json` (e.g. a query using an inflected form of a word that appears in the KB in another case) and confirm they pass.

- [ ] **Step 5: Commit** — `fix(retrieval): switch FTS to 'simple' config so Lithuanian gets lexical matching`.

---

### Task 4: Query-rewrite retry on weak retrieval

**Files:**
- Create: `lib/ai/query-rewrite.ts`
- Modify: `app/api/chat/route.ts:141-142`
- Test: `tests/unit/query-rewrite.test.ts`

**Interfaces:**
- Produces: `rewriteQuery(message: string, history: ChatMessage[], generate?: (prompt: string) => Promise<string>): Promise<string | null>` — null when rewrite adds nothing.

- [ ] **Step 1: Failing tests** (`tests/unit/query-rewrite.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { rewriteQuery } from '@/lib/ai/query-rewrite'

describe('rewriteQuery', () => {
  it('returns the rewritten standalone query from the model', async () => {
    const out = await rewriteQuery('o kiek kainuoja?', [
      { role: 'user', content: 'Ar turite dovanų kuponų?' },
      { role: 'assistant', content: 'Taip, turime dovanų kuponų.' },
    ], async () => 'dovanų kupono kaina')
    expect(out).toBe('dovanų kupono kaina')
  })

  it('returns null when the model output is empty or unchanged', async () => {
    expect(await rewriteQuery('kaina', [], async () => '')).toBeNull()
    expect(await rewriteQuery('kaina', [], async () => 'kaina')).toBeNull()
  })

  it('returns null when the model call throws', async () => {
    expect(await rewriteQuery('x', [], async () => { throw new Error('boom') })).toBeNull()
  })
})
```

- [ ] **Step 2: Run `npm test -- query-rewrite` — FAIL.**

- [ ] **Step 3: Implement `lib/ai/query-rewrite.ts`:**

```ts
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatMessage } from '@/lib/ai/prompt'

/**
 * One cheap rescue pass before serving the "I don't know" fallback: condense the
 * visitor's message (+ recent turns for pronouns/ellipsis) into a standalone,
 * keyword-rich retrieval query in the SAME language. Returns null when the
 * rewrite adds nothing — the caller then proceeds with the normal fallback.
 */
export async function rewriteQuery(
  message: string,
  history: ChatMessage[],
  generate: (prompt: string) => Promise<string> = defaultGenerate,
): Promise<string | null> {
  const recent = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
  const prompt =
    'Rewrite the final user message as a short, standalone search query for a help-center ' +
    'knowledge base. Resolve pronouns/references using the conversation. Keep the SAME language ' +
    'as the user. Output ONLY the query text (3-10 words), nothing else.\n\n' +
    (recent ? `Conversation:\n${recent}\n\n` : '') +
    `Final user message: ${message}`
  try {
    const out = (await generate(prompt)).trim().replace(/^["']|["']$/g, '')
    if (!out || out.toLowerCase() === message.trim().toLowerCase()) return null
    return out
  } catch {
    return null
  }
}

async function defaultGenerate(prompt: string): Promise<string> {
  const { text } = await generateText({ model: openai('gpt-4o-mini'), temperature: 0, prompt })
  return text
}
```

- [ ] **Step 4: Wire into `app/api/chat/route.ts`** — replace line 142:

```ts
// Retrieve grounding context; on a miss, retry once with a condensed standalone
// query (users write elliptical follow-ups that embed poorly).
let retrieval = await retrieveContext(bot.id, message, {}, serviceRetrievalDeps(svc))
if (retrieval.isWeak) {
  const rewritten = await rewriteQuery(message, history)
  if (rewritten) {
    const retry = await retrieveContext(bot.id, rewritten, {}, serviceRetrievalDeps(svc))
    if (!retry.isWeak) retrieval = retry
  }
}
```

(`const retrieval` → `let retrieval`; import `rewriteQuery`.)

- [ ] **Step 5: `npm test` — PASS. Commit** — `feat(retrieval): query-rewrite retry before serving the fallback`.

---

### Task 5: Hybrid product search (migration 0029)

**Files:**
- Create: `supabase/migrations/0029_product_hybrid.sql`
- Modify: `lib/products/search.ts:57-63`

**Interfaces:**
- Produces: `match_products(p_bot_id uuid, p_embedding vector(1536), p_query_text text, p_k int, p_audience text, p_min_similarity float)` — callers pass `p_query_text` for the lexical channel.

- [ ] **Step 1: Write the migration:**

```sql
-- ============================================================================
-- Hybrid product search. match_products was vector-only with NO similarity
-- floor: nonsense queries still "matched" top-k, and exact product names could
-- lose to vaguely-related items. Mirror match_chunks_hybrid: vector + FTS
-- ('simple' config — catalog is Lithuanian-first) fused with RRF, plus a
-- similarity floor for vector-only candidates.
-- ============================================================================

create index if not exists idx_product_embeddings_doc_fts
  on public.product_embeddings
  using gin (to_tsvector('simple', coalesce(doc, '')));

drop function if exists public.match_products(uuid, vector, int, text);

create function public.match_products(
  p_bot_id          uuid,
  p_embedding       vector(1536),
  p_query_text      text  default null,
  p_k               int   default 8,
  p_audience        text  default null,
  p_min_similarity  float default 0.25
)
returns table (
  external_id text, title text, url text, image_url text,
  tags text[], audience text, doc text, similarity float
)
language sql stable as $$
  with base as (
    select id, external_id, title, url, image_url, tags, audience, doc, embedding
    from public.product_embeddings
    where bot_id = p_bot_id
      and embedding is not null
      and (
        p_audience is null
        or audience is null
        or audience = 'unisex'
        or audience = p_audience
      )
  ),
  vec as (
    select id, 1 - (embedding <=> p_embedding) as similarity,
           row_number() over (order by embedding <=> p_embedding asc) as rank
    from base
    order by embedding <=> p_embedding asc
    limit 30
  ),
  fts as (
    select id,
           row_number() over (
             order by ts_rank_cd(
               to_tsvector('simple', coalesce(doc, '')),
               websearch_to_tsquery('simple', p_query_text)
             ) desc
           ) as rank
    from base
    where p_query_text is not null
      and websearch_to_tsquery('simple', p_query_text) @@
          to_tsvector('simple', coalesce(doc, ''))
    limit 30
  ),
  fused as (
    select coalesce(v.id, f.id) as id,
           v.similarity,
           f.rank as fts_rank,
           coalesce(1.0 / (60 + v.rank), 0.0) +
           coalesce(1.0 / (60 + f.rank), 0.0) as rrf_score
    from vec v
    full outer join fts f on f.id = v.id
  )
  select b.external_id, b.title, b.url, b.image_url, b.tags, b.audience, b.doc,
         coalesce(fu.similarity, 1 - (b.embedding <=> p_embedding))::float as similarity
  from fused fu
  join base b on b.id = fu.id
  where fu.fts_rank is not null
     or coalesce(fu.similarity, 0) >= p_min_similarity
  order by fu.rrf_score desc, similarity desc
  limit greatest(p_k, 1);
$$;

grant execute on function public.match_products(uuid, vector(1536), text, int, text, float)
  to anon, authenticated, service_role;
```

- [ ] **Step 2: Update `lib/products/search.ts`** RPC call:

```ts
const { data } = await db.rpc('match_products', {
  p_bot_id: bot.id,
  p_embedding: embedding,
  p_query_text: query,
  p_k: limit,
  p_audience: opts.audience ?? null,
})
```

- [ ] **Step 3: Apply the migration** (same flow as Task 3).

- [ ] **Step 4: Live verification** (WooCommerce test store must have an index; homebynb bot does): run the products eval from Task 10 once it exists, or minimally `npm test -- woocommerce` (live store test) plus a manual playground search for a query with adjectives (e.g. "kvapni žvakė namams") confirming sensible results.

- [ ] **Step 5: Commit** — `feat(products): hybrid vector+FTS match_products with similarity floor`.

---

### Task 6: Richer product docs (attributes) 

**Files:**
- Modify: `lib/products/catalog.ts` (WooCatalogItem, RawProduct, fetchWooCatalog, buildDoc)
- Test: `tests/unit/catalog.test.ts` (new)

**Interfaces:**
- Produces: `RawProduct.attributes: string[]` (lines like `"Spalva: raudona, mėlyna"`); `buildDoc` embeds them.

- [ ] **Step 1: Failing tests** (`tests/unit/catalog.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { buildDoc, deriveTags, type RawProduct } from '@/lib/products/catalog'

const base: RawProduct = {
  id: '1', title: 'Kvapni žvakė', url: 'https://x.lt/p/1', description: 'Sojų vaško žvakė',
  categories: ['Namų kvapai'], attributes: ['Kvapas: vanilė, levanda', 'Dydis: 250g'],
  onSale: false, featured: false, rank: 50,
}

describe('buildDoc', () => {
  it('embeds attributes so descriptive queries can match', () => {
    const doc = buildDoc(base, deriveTags(base), 'unisex')
    expect(doc).toContain('Attributes: Kvapas: vanilė, levanda; Dydis: 250g')
  })
  it('omits the attributes line when there are none', () => {
    const doc = buildDoc({ ...base, attributes: [] }, [], 'unisex')
    expect(doc).not.toContain('Attributes:')
  })
})
```

- [ ] **Step 2: Run — FAIL** (attributes not in RawProduct).

- [ ] **Step 3: Implement in `lib/products/catalog.ts`:**
  - `WooCatalogItem` gains `attributes?: Array<{ name?: string; terms?: Array<{ name?: string }> }>` (Store API shape).
  - `RawProduct` gains `attributes: string[]`.
  - In `fetchWooCatalog`, per product:

```ts
attributes: (p.attributes ?? [])
  .map((a) => {
    const name = decodeEntities(a.name ?? '')
    const terms = (a.terms ?? []).map((t) => decodeEntities(t.name ?? '')).filter(Boolean)
    return name && terms.length ? `${name}: ${terms.join(', ')}` : ''
  })
  .filter(Boolean)
  .slice(0, 8),
```

  - In `buildDoc`, after the Tags line:

```ts
if (p.attributes.length) parts.push('Attributes: ' + p.attributes.join('; '))
```

- [ ] **Step 4: `npm test` — PASS.** Note in commit body: existing indexes need a catalog re-sync (button or Task 8 cron) to pick up attributes.

- [ ] **Step 5: Commit** — `feat(products): embed product attributes in the semantic doc`.

---

### Task 7: Search-failure visibility + streaming error text

**Files:**
- Modify: `lib/products/search.ts` (log instead of silent catch), `lib/ai/commerce-tool.ts` (tool-level error result; `errorText` option; log catches), `app/api/chat/route.ts` (pass `errorText`)
- Test: `tests/unit/commerce-tool.test.ts` (new)

**Interfaces:**
- Produces: `search_products` tool returns `{ error: string }` on thrown search failures; `ndjsonChatResponse` accepts `errorText?: string`.

- [ ] **Step 1: Failing test** (`tests/unit/commerce-tool.test.ts`):

```ts
import { describe, it, expect } from 'vitest'
import { makeProductTools } from '@/lib/ai/commerce-tool'
import type { BotConfig } from '@/lib/types'

const config = { commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://x.lt' } } as unknown as BotConfig

describe('search_products failure handling', () => {
  it('tells the model the search FAILED (not "no products") when the impl throws', async () => {
    const tools = makeProductTools(config, [], undefined, async () => { throw new Error('woo down') })
    const result = await (tools.search_products.execute as (i: unknown, o: unknown) => Promise<unknown>)(
      { query: 'žvakė' }, {} as never,
    )
    expect(result).toMatchObject({ error: expect.stringContaining('failed') })
  })
})
```

- [ ] **Step 2: Run — FAIL** (currently throws through / returns nothing).

- [ ] **Step 3: Implement.**
  - `lib/ai/commerce-tool.ts` `search_products.execute`: wrap the search in try/catch:

```ts
execute: async ({ query, minPrice, maxPrice, audience }) => {
  try {
    const products = searchImpl
      ? await searchImpl({ query, minPrice, maxPrice, limit: 24, audience })
      : await searchStore(config.commerce, { query, minPrice, maxPrice, limit: 24 })
    products.forEach((p) => candidates.set(p.id, p))
    return products.map((p) => ({
      id: p.id, title: p.title, price: p.price, inStock: p.inStock,
      description: p.shortDescription?.slice(0, 140),
    }))
  } catch (err) {
    console.error('[agent] search_products failed:', err)
    return {
      error:
        'Product search failed temporarily (store API error). Retry the same search once. ' +
        'If it fails again, tell the shopper you could not check the catalog right now — ' +
        'do NOT claim the item is unavailable.',
    }
  }
},
```

  - `lib/products/search.ts`: in the semantic-path `catch`, log before falling back: `console.error('[agent] semantic product search failed, falling back to keyword:', err)`. Also, when semantic matches exist but hydration returns an empty map (store API down), `throw new Error('product hydration failed')` instead of silently continuing — the keyword fallback would hit the same dead store; the tool-level catch (above) now handles it honestly. Concretely: after `const live = await hydrateWoo(...)`, add `if (live.size === 0) throw new Error('product hydration failed: store API unreachable')`.
  - `ndjsonChatResponse` in `lib/ai/commerce-tool.ts`: add `errorText?: string` to opts; in the stream `catch`: `console.error('[agent] chat stream failed:', err)` and `line({ t: 'text', v: opts.errorText ?? '' })`; also `fullText = fullText || (opts.errorText ?? '')` so the persisted transcript matches. In the `onText` catch: `console.error('[agent] failed to persist assistant message:', err)`.
  - `app/api/chat/route.ts`: pass `errorText: contentFor(bot.config, lang).fallbackMessage` into `ndjsonChatResponse`.

- [ ] **Step 4: `npm test` — PASS. Commit** — `fix(agent): surface search/stream failures instead of swallowing them`.

---

### Task 8: Prompt cleanup — natural product queries

**Files:**
- Modify: `lib/ai/prompt.ts:91-97` (rule 3 of PRODUCT SEARCH), `lib/ai/commerce-tool.ts:35-41` (search_products description), `agent-prompt.md:33-40,57-61`
- Test: `tests/unit/prompt.test.ts`

- [ ] **Step 1: Failing test** — extend `tests/unit/prompt.test.ts`: build a commerce-enabled system prompt and assert it no longer forbids adjectives and mentions descriptive queries:

```ts
expect(system).not.toContain('no adjectives')
expect(system).toContain('descriptive')
```

- [ ] **Step 2: Rewrite rule (3) in `lib/ai/prompt.ts`** (replace the "ONE SHORT BASE noun … no adjectives or plurals" sentence; keep the retry + cross-language guidance):

```
'(3) Write each `search_products` query as a SHORT descriptive phrase in the catalog language — ' +
'the product type plus at most 1-2 meaningful qualifiers ("kvapni žvakė", "veido kremas sausai ' +
'odai", "dovanų kuponas"). Search supports natural descriptive queries; do not strip helpful ' +
'qualifiers, but do not paste whole sentences either. If a search returns nothing, you MUST ' +
'RETRY before concluding it is unavailable: try the base noun alone, a close synonym, and the ' +
'SAME term in the other language (EN ↔ LT: "candle" ↔ "žvakė", "perfume" ↔ "kvepalai", ' +
'"gift card" ↔ "dovanų kuponas", "face cream" ↔ "veido kremas"). For an open/gift need, run ' +
'SEVERAL searches — one per concept from (1) — to gather a broad, varied set. ' +
```

- [ ] **Step 3: Update `search_products` tool description** in `lib/ai/commerce-tool.ts` — replace "avoid vague single adjectives" phrasing with: `'Use a short descriptive phrase in the catalog language (often Lithuanian), e.g. "kvapni žvakė" or "veido kremas sausai odai". If a search returns an { error }, retry once before telling the shopper anything.'` (keep the audience guidance).

- [ ] **Step 4: Update `agent-prompt.md`** the same way (lines 35, 38, 59): descriptive phrases allowed, retry guidance unchanged. Note for the owner: re-save this prompt in `/owner/prompts` so it re-pushes to referencing bots (runtime uses the DB snapshot, not this file).

- [ ] **Step 5: `npm test` — PASS. Commit** — `feat(prompts): allow natural descriptive product queries (hybrid search handles them)`.

---

### Task 9: Scheduled catalog sync (cron)

**Files:**
- Create: `app/api/cron/catalog-sync/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the route** (mirror `cron/retention` auth — fail closed):

```ts
import { createServiceClient } from '@/lib/supabase/service'
import { syncProductCatalog } from '@/lib/products/sync'
import type { Bot } from '@/lib/types'

export const maxDuration = 300

/**
 * Nightly catalog re-sync (Vercel Cron) so the semantic product index tracks the
 * live store (new products, renamed titles, category changes) without anyone
 * pressing "Sync catalog". Only bots that ALREADY have an index are refreshed —
 * the first sync stays an explicit owner action.
 */
export async function GET(req: Request) {
  // Fail CLOSED: service-role, cross-tenant job — never run for anonymous callers.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const svc = createServiceClient()
  const { data: bots } = await svc.from('bots').select('*').eq('status', 'active')

  const results: Record<string, string> = {}
  for (const bot of (bots ?? []) as Bot[]) {
    const c = bot.config.commerce
    if (!c?.enabled || c.provider !== 'woocommerce' || !c.storeUrl) continue
    const { count } = await svc
      .from('product_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot.id)
    if (!count) continue // no index yet — first sync is manual
    try {
      const { synced } = await syncProductCatalog(bot, svc)
      results[bot.id] = `synced ${synced}`
    } catch (err) {
      console.error(`[cron] catalog sync failed for bot ${bot.id}:`, err)
      results[bot.id] = 'error'
    }
  }
  return Response.json({ ok: true, results })
}
```

- [ ] **Step 2: Add to `vercel.json`:**

```json
{
  "crons": [
    { "path": "/api/cron/retention", "schedule": "0 3 * * *" },
    { "path": "/api/cron/catalog-sync", "schedule": "0 4 * * *" }
  ]
}
```

- [ ] **Step 3: Verify locally**: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/catalog-sync` with dev server running → `{ ok: true, results: {...} }`; unauthorized without header.

- [ ] **Step 4: Commit** — `feat(products): nightly catalog re-sync cron`.

---

### Task 10: Voice/text parity + per-IP widget rate limits

**Files:**
- Modify: `app/api/widget/knowledge/route.ts:35,40-44`, `app/api/widget/search/route.ts:42`

- [ ] **Step 1: Knowledge parity** — replace the top-3/900-char slice with text-chat-equivalent context:

```ts
if (retrieval.chunks.length) {
  // Same K as text chat (top 5) so spoken answers draw on the same evidence;
  // cap the payload so the spoken reply stays fast.
  answer = retrieval.chunks.map((c) => c.content).join('\n\n').slice(0, 4000)
}
```

Also replace the silent `catch {}` with `catch (err) { console.error('[agent] voice knowledge retrieval failed:', err) }`.

- [ ] **Step 2: Per-IP rate-limit keys** in both widget routes (they currently throttle per BOT — one busy visitor throttles everyone):

```ts
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
if (!limiter.check(`${bot.id}:${ip}`)) return json({ ... }, 429)
```

(keep each route's existing 429 response shape). Add `console.error` to the two silent catches in `widget/search` as well.

- [ ] **Step 3: `npm test` — PASS (no route unit tests exist; suite guards regressions). Commit** — `fix(voice): give the voice agent text-chat-equivalent knowledge context; per-visitor widget rate limits`.

---

### Task 11: Eval tooling

**Files:**
- Create: `scripts/eval-mine-conversations.mjs`, `scripts/eval-products.mjs`, `scripts/product-eval-cases.json`, `scripts/eval-answers.mjs`, `scripts/answer-eval-cases.json`

**Interfaces:**
- Case formats: products `{query, audience?, expect: string[]}` (expect = lowercase substrings, ANY of which must appear in a returned title/doc); answers `{question, mustInclude: string[], language}`.

- [ ] **Step 1: `scripts/eval-mine-conversations.mjs`** — dump real visitor questions for curation:

```js
// Usage: node scripts/eval-mine-conversations.mjs --bot <uuid> [--limit 200]
import { createClient } from '@supabase/supabase-js'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : dflt
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const botId = arg('bot')
if (!botId) throw new Error('--bot <uuid> required')

const { data: convs } = await db.from('conversations').select('id').eq('bot_id', botId)
const ids = (convs ?? []).map((c) => c.id)
const { data: msgs } = await db
  .from('messages')
  .select('content, conversation_id, created_at')
  .in('conversation_id', ids)
  .eq('role', 'user')
  .order('created_at', { ascending: false })
  .limit(Number(arg('limit', '200')))

const seen = new Set()
const out = []
for (const m of msgs ?? []) {
  const q = m.content.trim()
  const key = q.toLowerCase()
  if (q.length < 4 || seen.has(key)) continue
  seen.add(key)
  out.push({ question: q, mustInclude: [], language: /[ąčęėįšųūž]/i.test(q) ? 'lt' : 'en' })
}
console.log(JSON.stringify(out, null, 2))
```

- [ ] **Step 2: `scripts/product-eval-cases.json`** — seed 12+ homebynb-realistic cases (extend after mining), e.g.:

```json
[
  { "query": "kvapni žvakė", "expect": ["žvak"] },
  { "query": "kvapnios žvakės namams", "expect": ["žvak", "kvap"] },
  { "query": "veido kremas", "expect": ["krem", "veid"] },
  { "query": "veido kremas sausai odai", "expect": ["krem", "veid"] },
  { "query": "dovanų kuponas", "expect": ["kupon"] },
  { "query": "gift card", "expect": ["kupon", "gift"] },
  { "query": "dovana moteriai", "audience": "women", "expect": [] },
  { "query": "dovana vyrui", "audience": "men", "expect": [] },
  { "query": "kvepalai namams", "expect": ["kvap", "namų", "difuzor"] },
  { "query": "pledas", "expect": ["pled"] },
  { "query": "puodelis", "expect": ["puodel"] },
  { "query": "scented candle", "expect": ["žvak", "candle"] }
]
```

(Empty `expect` = only assert ≥1 result and, when `audience` set, no wrong-audience rows.)

- [ ] **Step 3: `scripts/eval-products.mjs`** — recall against `match_products` directly (mirrors `eval-retrieval.mjs` style):

```js
// Usage: node scripts/eval-products.mjs --bot <uuid> [--file scripts/product-eval-cases.json] [--k 8]
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : dflt
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const openai = new OpenAI()
const botId = arg('bot')
if (!botId) throw new Error('--bot <uuid> required')
const k = Number(arg('k', '8'))
const cases = JSON.parse(readFileSync(arg('file', 'scripts/product-eval-cases.json'), 'utf8'))

let pass = 0
for (const c of cases) {
  const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: c.query })
  const { data, error } = await db.rpc('match_products', {
    p_bot_id: botId,
    p_embedding: emb.data[0].embedding,
    p_query_text: c.query,
    p_k: k,
    p_audience: c.audience ?? null,
  })
  if (error) throw error
  const rows = data ?? []
  const hay = rows.map((r) => `${r.title} ${r.doc}`.toLowerCase()).join(' | ')
  const kwOk = !c.expect?.length || c.expect.some((e) => hay.includes(e.toLowerCase()))
  const audOk = !c.audience || rows.every((r) => !r.audience || r.audience === 'unisex' || r.audience === c.audience)
  const ok = rows.length > 0 && kwOk && audOk
  if (ok) pass++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.query}  (${rows.length} rows)${ok ? '' : ` — top: ${rows.slice(0, 3).map((r) => r.title).join('; ')}`}`)
}
console.log(`\nproduct recall@${k}: ${pass}/${cases.length}`)
```

- [ ] **Step 4: `scripts/eval-answers.mjs`** — end-to-end accuracy with an LLM judge (this is the "beat 81%" number):

```js
// Usage: LOQARA_URL=http://localhost:3000 BOT_KEY=<publicKey> node scripts/eval-answers.mjs [--file scripts/answer-eval-cases.json]
import { readFileSync } from 'node:fs'
import OpenAI from 'openai'

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : dflt
}
const base = process.env.LOQARA_URL ?? 'http://localhost:3000'
const key = process.env.BOT_KEY
if (!key) throw new Error('BOT_KEY (bot public key) required')
const openai = new OpenAI()
const cases = JSON.parse(readFileSync(arg('file', 'scripts/answer-eval-cases.json'), 'utf8'))

async function ask(question) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: key, visitorId: `eval-${Date.now()}-${Math.random()}`, message: question }),
  })
  const text = await res.text()
  let answer = ''
  for (const lineStr of text.split('\n')) {
    if (!lineStr.trim()) continue
    try {
      const obj = JSON.parse(lineStr)
      if (obj.t === 'text') answer += obj.v
    } catch { /* ignore non-JSON lines */ }
  }
  return answer
}

let pass = 0
for (const c of cases) {
  const answer = await ask(c.question)
  const { choices } = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [{
      role: 'user',
      content:
        `Question (${c.language}): ${c.question}\n\nAssistant answer:\n${answer}\n\n` +
        `Required facts (all must be present or correctly conveyed): ${JSON.stringify(c.mustInclude)}\n\n` +
        'Reply with exactly PASS or FAIL followed by a one-line reason.',
    }],
  })
  const verdict = choices[0].message.content ?? ''
  const ok = verdict.startsWith('PASS')
  if (ok) pass++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.question}\n      ${verdict.slice(0, 140)}`)
}
console.log(`\nanswer accuracy: ${pass}/${cases.length} (${Math.round((100 * pass) / cases.length)}%) — Parnidia claims 81%`)
```

- [ ] **Step 5: `scripts/answer-eval-cases.json`** — seed with 10 knowledge questions curated from the mining output (Step 1) + obvious ones (shipping cost, return window, contact email, working hours, gift-coupon availability — fill `mustInclude` from the homebynb KB). Commit whatever is curatable now; expand after running the miner.

- [ ] **Step 6: Run the pipeline once** (dev server up): miner → curate → `eval-products` → `eval-answers`. Record the numbers in the commit message as the baseline.

- [ ] **Step 7: Commit** — `feat(evals): conversation miner, product recall, and LLM-judged answer accuracy`.

> Parnidia side-by-side benchmarking is deliberately NOT scripted here (their widget internals/selectors are unknown and it's their infra) — do it interactively with browser tooling in a follow-up session using the same `answer-eval-cases.json` questions.

---

### Task 12: Final verification

- [ ] **Step 1:** `npm test` — full suite green.
- [ ] **Step 2:** `npm run build` — clean production build (catches route/type errors in modified API routes).
- [ ] **Step 3:** Manual playground smoke test (owner preview): a Lithuanian policy question, an elliptical follow-up ("o kiek kainuoja?"), a descriptive product query with adjectives, a gift query with audience, and a voice call asking a KB question.
- [ ] **Step 4:** Run `node scripts/upgrade-bot-models.mjs --dry`, review, then run for real. Re-sync homebynb catalog (button) to pick up attribute-enriched docs. Re-save the base prompt in `/owner/prompts`.
- [ ] **Step 5:** Commit any stragglers; update memory notes if root causes changed.
