# Agent Quality Sprint — Design

**Date:** 2026-07-02
**Goal:** Make the chat + voice agent reliably better than Parnidia's Neria (~81% claimed accuracy) on homebynb.lt: consistent answers, strong Lithuanian retrieval, product search that survives natural queries, and a measurable eval baseline.

## Context

Full audit (2026-07-02) found the portals/features complete but the agent brain weak. Root causes, in impact order:

1. Default LLM is `gpt-4o-mini` (chat + voice) driving a 14-step commerce tool loop in Lithuanian.
2. Knowledge FTS hardcodes the `'english'` tsvector config (migration 0020) — Lithuanian loses the lexical half of hybrid retrieval.
3. Product search is vector-only (`match_products`, no similarity floor, no keyword blend, thin embedded docs); the prompt works around it with "noun only, no adjectives". Manual-only catalog sync; silent hydration failures read as "product unavailable".
4. Voice gets top-3 chunks truncated to 900 chars; text gets full top-5 — voice is lossier by design.
5. Weak retrieval (0 chunks) returns a hardcoded fallback without calling the LLM; second miss auto-escalates to human.
6. Silent catch blocks + no evals = no visibility into failures.

## Decisions (user-approved)

- **Model:** upgrade default to a stronger OpenAI model; keep `gpt-4o-mini` for cheap side-tasks (enrichment, summaries, lint, intel).
- **Scope:** agent-quality first; sales-readiness features (themes, onboarding, notifications) deferred.
- **Evals:** three sources — mine existing DB conversations, benchmark Parnidia's live widget, synthetic Lithuanian shopper set with LLM judge.

## Design

### 1. Model upgrade

- New module `lib/ai/chat-models.ts`: `DEFAULT_CHAT_MODEL = 'gpt-4.1'` (strong tool-calling, supports temperature, priced ~$2/$8 per Mtok — negligible vs. €149+/mo plans) plus a `CHAT_MODEL_OPTIONS` list for the owner UI (gpt-4.1, gpt-4o, gpt-4o-mini).
- Replace every `'gpt-4o-mini'` **chat default** with the constant: `app/api/chat/route.ts`, `app/api/preview/chat/route.ts`, `lib/validation/schemas.ts` (bot config default), `components/client/TestChat.tsx`. Existing bots whose saved config still says `gpt-4o-mini` keep working; new/edited bots get the new default. A one-off script updates existing bot configs that still carry the old default.
- Voice: `DEFAULT_VOICE_LLM` → `'gpt-4o'` (already in ElevenLabs' validated enum). Attempt to add `gpt-4.1` to `VOICE_LLM_OPTIONS` only after verifying against the ElevenLabs enum at runtime — out of sprint scope if it 400s.
- Default temperature stays owner-configurable; lower the fallback from 0.3 → 0.2 for consistency.
- Side-task models (enrich/canonical/lint/conversation-intel) stay on `gpt-4o-mini` — explicitly unchanged.

### 2. Lithuanian retrieval fix

- Migration `0028_fts_simple.sql`: drop `idx_document_chunks_content_fts`; recreate with `to_tsvector('simple', content)`; `create or replace function match_chunks_hybrid` using `'simple'` in both `to_tsvector` and `websearch_to_tsquery`. `'simple'` = no stemming/stopwords for any language: exact lexemes (emails, product names, Lithuanian words) match; the vector side continues to carry semantics. This is strictly better than `'english'` for a Lithuanian-first corpus.
- No re-ingest needed (index is expression-based; embeddings untouched).

### 3. Weak-retrieval rescue (query rewrite)

- In `retrieveContext` callers (chat route): when `isWeak`, run one cheap rewrite pass — `gpt-4o-mini` condenses the user message + last 2 turns into a standalone, keyword-rich query (same language), then retry retrieval once. Only if the retry is also weak do we serve the fallback / count toward escalation.
- Keeps the existing fallback + escalation semantics otherwise.

### 4. Product search v2

- Migration `0029_product_hybrid.sql`:
  - Add FTS index on `product_embeddings.doc` with `'simple'` config.
  - Replace `match_products` with a hybrid version mirroring `match_chunks_hybrid`: vector top-30 + FTS top-30 → RRF (k=60), keep rows with an FTS hit OR similarity ≥ 0.25, return top-k with similarity.
- Richer embedded docs (`lib/products/catalog.ts` `buildDoc`): include WooCommerce **attributes** (color/material/scent etc. from Store API `attributes[]`) and keep title/audience/categories/tags/description. Store API product payload already carries `attributes`; extend `fetchWooCatalog`/`normalize` to capture them. Requires a catalog re-sync to take effect (documented; sync button exists).
- **Failure visibility:** in `lib/products/search.ts`, distinguish "no matches" from "search errored" — on hydration/RPC failure return a typed error result so `search_products` tells the model "search failed, try again" instead of implying the catalog lacks the item. The auto-fallback to keyword `searchStore` stays.
- **Prompt cleanup:** remove the "SHORT noun only, no adjectives" workaround from `agent-prompt.md` and the product-search block in `lib/ai/prompt.ts`; instruct natural descriptive queries (hybrid search now handles them) while keeping the catalog-language hint.

### 5. Scheduled catalog sync

- New `app/api/cron/catalog-sync/route.ts` (same auth pattern as `cron/retention`, fail-closed): iterate bots with `commerce.enabled && provider === 'woocommerce'` and an existing index; re-run the sync pipeline per bot with per-bot error isolation. Add to `vercel.json` crons (daily, 04:00).

### 6. Voice/text parity

- `app/api/widget/knowledge/route.ts`: return top-5 chunks (same K as text), per-chunk cap raised to ~1200 chars, joined — ElevenLabs handles this context size fine.
- Rate-limit keys on `widget/knowledge` and `widget/search`: `bot.id` → `bot.id:visitorId` (widget already knows the visitor; pass it in the client tool config if absent, else fall back to IP).

### 7. Observability + evals

- Replace silent `catch {}` in the retrieval/search/persistence paths with `console.error('[agent] …', err)` (Vercel log-visible), preserving current fallback behavior.
- Eval tooling in `scripts/`:
  - `eval-mine-conversations.mjs` — pull real user questions from the `messages` table for the homebynb bot into eval-case JSON (manual curation pass afterwards).
  - `eval-products.mjs` — product-search recall/precision: cases = query → expected product ids/keywords; runs `searchCatalog` directly.
  - `eval-answers.mjs` — end-to-end: replay eval questions through the chat pipeline, LLM-judge (gpt-4o-mini rubric) answers against expected facts; outputs accuracy % (the number to beat: 81%).
  - `bench-parnidia.mjs` — Playwright script driving the Parnidia widget on homebynb.lt with the same question set, saving transcripts for side-by-side judging. Best-effort/manual-run only (their bot, their terms).
- Existing `eval-retrieval.mjs` re-run before/after the FTS migration to quantify the gain.

## Out of scope (deferred to sales-readiness track)

Theme presets / theme-from-URL, onboarding wizard, email notifications, Stripe go-live, reranker, embedding-model change, variant selection UI, Shopify/Magento semantic index, channels (Messenger/IG), webhooks.

## Testing

- Unit: chunk/search/prompt changes covered by extending existing vitest suites (`npm test` — required wrapper per project memory); new tests for query-rewrite trigger, hybrid product RPC mapping, error-vs-empty search results.
- SQL: migrations applied to the linked Supabase project via existing migration flow; `eval-retrieval.mjs` as the acceptance test for retrieval changes.
- Live: `tests/unit/woocommerce.test.ts` live-store test against homebynb.lt still passes; manual chat/voice smoke test in the preview playground.

## Risks

- `'simple'` FTS slightly weakens English stemming recall (mitigated by vector side + RRF; eval will confirm).
- ElevenLabs enum drift for voice LLM ids — validate before shipping the default change.
- Attribute-enriched docs need a full re-sync per bot (5-min job, manual button or the new cron).
- gpt-4.1 output style differs from gpt-4o-mini — re-check the warmth/formatting prompt blocks in the playground after the swap.
