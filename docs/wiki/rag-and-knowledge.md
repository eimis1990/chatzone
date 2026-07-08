# RAG & knowledge

How a bot's answers stay grounded in the client's own content.

## Ingestion (`lib/ingestion/`)

- **Crawl** (`crawl.ts:99` `discoverPages`) prefers the site's sitemap
  (robots.txt-declared + common paths, one level of sitemap-index expansion);
  falls back to following same-origin links from the base page if no sitemap
  yields anything.
- **Fetch** (`parse.ts:71` `parseUrl`): SSRF-guarded (`assertPublicUrl`, see
  [access-model](access-model.md)), then **Jina Reader** (`jina-reader.ts`,
  renders JS → Markdown) with fallback to direct `fetch` +
  Readability/Turndown (`parse.ts:8` `extractReadableText`) if Jina fails.
- **Chunk** (`chunk.ts:81` `chunkText`): heading-aware — splits on blank
  lines, a Markdown heading always starts a new chunk, blocks are packed to
  ~300 tokens (`maxTokens` default), oversized blocks fall back to
  sentence-splitting with ~15% overlap.
- **Embed + store**: `pipeline.ts:58` `ingestSource` — parse → chunk → embed
  → replace the source's `document_chunks` rows, updating `status` on
  `knowledge_sources` as it goes (never throws; failures land in
  `error_message`). Triggered per-source from `app/api/ingest/route.ts`, or in
  bulk (crawl + ingest + canonical regen) from `app/api/crawl/route.ts`.
- A manual edit in the Knowledge manager UI
  (`components/client/knowledge/SourceDrawer.tsx:68`) is persisted as
  `metadata.contentOverride` and, per `pipeline.ts:34`, overrides the
  fetched/parsed text for **any** source type on every re-ingest.
- Changing the chunker requires re-ingesting existing sources (old chunks
  aren't retroactively resplit).

## Canonical pages (`lib/ingestion/canonical.ts`)

- `generateCanonicalPages` synthesizes 6 bilingual (EN/LT) "answer summary"
  pages per bot — returns, shipping, payment, contact, warranty, ordering
  (`canonical.ts:32`) — from the bot's own retrieved chunks, via `gpt-4o-mini`
  (`canonical.ts:104`). Strictly grounded: yields `NONE` (skipped, not
  invented) if the KB has nothing on a topic.
- Stored as a normal `knowledge_sources` row with `metadata.kind ===
  'canonical'`; idempotent regeneration preserves a manual
  `contentOverride`. Runs automatically after every crawl
  (`app/api/crawl/route.ts:147`).

## Retrieval (`lib/ai/retrieval.ts`)

- **Hybrid search**: vector (cosine) + full-text, fused with Reciprocal Rank
  Fusion, via the `match_chunks_hybrid` RPC
  (`retrieval.ts:63`). Defaults: `k=5`, min similarity `0.2`
  (`retrieval.ts:6-12`) — a floor deliberately kept low because reworded
  questions often score 0.2–0.3; the grounding prompt is what stops weak
  matches from being used, not the threshold.
- FTS uses the **`simple`** tsvector config, not `english` — migration
  `0028_fts_simple.sql` fixed Lithuanian queries losing the lexical channel
  entirely under English stemming.
- **Canonical boost**: migration `0030_canonical_boost.sql` adds a flat
  `+1/50` RRF bonus to chunks from `canonical` sources, so a synthesized
  summary page outranks incidental noise (e.g. a privacy-policy page burying
  the real "Contact & business details" answer).
- A chunk survives the filter if it hit full-text OR its cosine similarity
  clears the floor (`0030_canonical_boost.sql:70-71`) — weak-vector +
  no-FTS-hit chunks are dropped as noise.

## Eval harnesses (`scripts/`)

- `eval-retrieval.mjs` — recall@k, vector-only vs hybrid, keyword-hit scoring
  against `retrieval-eval-cases.json`.
- `eval-answers.mjs` — end-to-end: replays `answer-eval-cases.json` (10 cases)
  through the real `/api/chat` and grades with an LLM judge (`eval-answers.mjs:4-5`);
  the number to beat is the competitor's published ~81% accuracy.
- Default chat model is `gpt-4.1` (`lib/ai/chat-models.ts:7`); canonical
  synthesis and other light tasks stay on `gpt-4o-mini` for cost
  (`lib/ai/chat-models.ts:3-5`).

> ⚠️ verify: the "10/10" pass rate from the 2026-07 quality sprint is a
> point-in-time eval run, not something re-derivable from the code — rerun
> `eval-answers.mjs` against a live bot to reconfirm current accuracy.

## Products vs. chunks

Product search is a **separate** index — see [commerce](commerce.md). RAG
chunks are for policy/FAQ/general content only.

_Last verified: 2026-07-08 (66f6bb8)._
