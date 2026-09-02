# RAG & knowledge

How a bot's answers stay grounded in the client's own content.

## Ingestion (`lib/ingestion/`)

- **Crawl** (`crawl.ts:99` `discoverPages`) prefers the site's sitemap
  (robots.txt-declared + common paths, one level of sitemap-index expansion);
  falls back to following same-origin links from the base page if no sitemap
  yields anything. The base page is seeded first — adding it after the sitemap
  loop used to drop it silently whenever the sitemap filled `maxPages`.
- **Discovery must out-scale the sitemap**: the route's `DISCOVER_CAP`
  (`app/api/crawl/route.ts:22`) is 1000 because the priority sort runs AFTER
  discovery. A low cap truncated the sitemap in child-sitemap order, and
  WordPress sitemap indexes list `post-sitemap` first — taujenudvaras.lt's
  first crawl (2026-08-12) filled all 60 slots with stale event posts and never
  saw `page-sitemap`'s core pages. `priorityScore` ranks contact/policy/service
  pages first and dated sections (blogs, news, `renginiai`/events in five
  languages, category/author archives) last — a low-value section always ranks
  last even when its slug contains a priority word.
- **Fetch** (`parse.ts:71` `parseUrl`): SSRF-guarded (`assertPublicUrl`, see
  [access-model](access-model.md)), then **Jina Reader** (`jina-reader.ts`,
  renders JS → Markdown) with fallback to direct `fetch` +
  Readability/Turndown (`parse.ts:8` `extractReadableText`) if Jina fails.
  Jina requests send `X-Remove-Selector: header, footer, nav, aside` to match
  the Readability path — without it every page ingests its nav/language-picker
  link lists, which crowd real content out of top-k (taujenudvaras.lt
  "kontaktai" queries returned five nav chunks). Both paths then strip image
  markdown (`stripMarkdownImages`): images embed nothing, and an image-only
  block between a heading and its body used to split them into separate chunks.
- **Chunk** (`chunk.ts:81` `chunkText`): heading-aware — splits on blank
  lines, a Markdown heading starts a new chunk, blocks are packed to
  ~300 tokens (`maxTokens` default), oversized blocks fall back to
  sentence-splitting with ~15% overlap. Exception: a stack of consecutive
  bare headings stays together ("# Didžioji salė" + "### ≤ 300" + specs is one
  chunk — a name-only chunk retrieves nothing and the spec chunk loses its
  name).
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

- `generateCanonicalPages` synthesizes 6 "answer summary" pages per bot —
  returns, shipping, payment, contact, warranty, ordering (`canonical.ts`) —
  from the bot's own retrieved chunks, via `gpt-4o-mini`. Strictly grounded:
  yields `NONE` (skipped, not invented) if the KB has nothing on a topic.
- **Pages are truly bilingual since 2026-08-10**: every page carries a
  `## Santrauka (LT)` section and a `## Summary (EN)` section with identical
  facts. The heading-aware chunker indexes each section separately, so LT
  questions lexically match the LT chunk and vice versa. Before this only the
  retrieval QUERIES were bilingual — the page came out in whatever language
  the source excerpts were (HomeByNB's shipping summary was English-only,
  invisible to Lithuanian FTS).
- **Facts are ordered customer-first within each section** (working hours,
  address, contacts, prices first; company code/VAT last) — a rekvizitai-first
  contact page pushed the working hours out of retrieval reach for
  "kada dirbate?"-style phrasings. Changing this prompt requires
  re-running canonical generation per bot (crawl does it automatically).
- Stored as a normal `knowledge_sources` row with `metadata.kind ===
  'canonical'`; idempotent regeneration preserves a manual
  `contentOverride`. Runs automatically after every crawl
  (`app/api/crawl/route.ts:147`).

## Retrieval (`lib/ai/retrieval.ts`)

- **Hybrid search**: vector (cosine) + full-text, fused with Reciprocal Rank
  Fusion, via the `match_chunks_hybrid` RPC
  (`retrieval.ts`). Defaults: `k=5`, min similarity `0.2` — a floor
  deliberately kept low because reworded
  questions often score 0.2–0.3; the grounding prompt is what stops weak
  matches from being used, not the threshold.
- **FTS is OR-semantics, diacritic-folded, prefix-tolerant** (migration
  `20260810190000_hybrid_or_fts_dedup.sql`, from HomeByNB's real-visitor
  feedback): the old `websearch_to_tsquery` ANDed every token, so "Koks jūsų
  darbo laikas?" never matched the chunk containing "Darbo laikas:". Now an OR
  tsquery over `fold_lt()`-folded tokens (≥7-char tokens also as 6-char
  prefixes, covering LT inflections like paštomatus↔paštomatą) ranked by
  `ts_rank_cd` — multi-token dense hits still rank first. Folded FTS has its
  own GIN expression index (`document_chunks_fold_fts_idx`).
- **Identical-content dedup** (same migration): crawled pages share
  header/footer boilerplate — HomeByNB's index held ~12 copies of one footer
  chunk that filled 3 of the top-5 slots. Only the best-scoring chunk per
  `md5(content)` survives.
- FTS uses the **`simple`** tsvector config, not `english` — migration
  `0028_fts_simple.sql` fixed Lithuanian queries losing the lexical channel
  entirely under English stemming.
- **Canonical boost**: migration `0030_canonical_boost.sql` adds a flat
  `+1/50` RRF bonus to chunks from `canonical` sources, so a synthesized
  summary page outranks incidental noise (e.g. a privacy-policy page burying
  the real "Contact & business details" answer).
- A chunk survives the filter if it hit full-text OR its cosine similarity
  clears the floor — weak-vector + no-FTS-hit chunks are dropped as noise.
- **Two weakness tiers** (`retrieval.ts`): `isWeak` (zero matches) still
  triggers the fallback message; `isLowConfidence` (empty OR top similarity
  < 0.28) triggers the one-shot `rewriteQuery` retry in BOTH `/api/chat` and
  `/api/preview/chat`. Before this, "o kur ji yra?" pulled 5 privacy-policy
  noise chunks (top sim 0.276), so the old zero-match rewrite never fired —
  and preview had no rewrite at all (preview/live parity gap).
- **Fast lane** (`lib/ai/fast-lane.ts`, per-bot `config.fastLane`, default off):
  after retrieval, a top similarity ≥ 0.40 with no product/delivery/order/
  discount intent (EN+LT stems) and no product cards on screen answers with NO
  tools and the plain KB prompt (commerce block omitted) — same model. Applied
  in both `/api/chat` and `/api/preview/chat`. Rollout: 3IMIS test copy first.
  Spec: `docs/superpowers/specs/2026-09-02-chat-latency-fast-lane-design.md`.
- **Timing log**: every model-backed turn logs one `[chat] timing bot=… lane=…
  model=… pre=…ms retrievalWait=…ms embed=…ms match=…ms top=0.xx rewrote=0|1
  ttft=…ms total=…ms toolCalls=N` line (`ndjsonChatResponse`, `commerce-tool.ts`).
  Retrieval starts right after the bot resolves and overlaps the DB checks, so
  `retrievalWait` is normally 0; the `rewrote=1` path adds ~1.4s sequentially.

## Eval harnesses (`scripts/`)

- `eval-retrieval.mjs` — recall@k, vector-only vs hybrid, keyword-hit scoring
  against `retrieval-eval-cases.json`.
- `eval-answers.mjs` — end-to-end: replays `answer-eval-cases.json` (10 cases)
  through the real `/api/chat` and grades with an LLM judge (`eval-answers.mjs:4-5`);
  the number to beat is the competitor's published ~81% accuracy.
- Default chat model is `gpt-4.1` (`lib/ai/chat-models.ts:7`); canonical
  synthesis and other light tasks stay on `gpt-4o-mini` for cost
  (`lib/ai/chat-models.ts:3-5`).

- Last reconfirmed 2026-08-10 (post OR-FTS/dedup retrieval rework):
  `eval-answers.mjs` 10/10 on the 3IMIS HomeByNB test bot;
  `eval-products.mjs` 16/17 (unchanged — the 1 fail is the stale "pledas"
  case, store no longer sells blankets).

## Knowledge check (lint) + resolution (`lib/ingestion/lint.ts`)

- `generateKbLint` audits the bot's OWN content per canonical topic for
  contradictions / stale content / gaps (grounded, conservative, `gpt-4o-mini`).
  Read-only scan behind `POST /api/knowledge/lint` + the "Check for issues" button.
- Each finding carries the **source(s)** its excerpts came from (mapped from the
  model's `excerptRefs` → `support[i].source_id`), an AI **`suggestedFix`**, and a
  stable **`id`** fingerprint (hash of type+topic+evidence).
- Resolution UI: each finding has **Resolve** (opens `LintResolveDialog` — pick the
  correct conflicting line, or "keep both") and **Dismiss**. "Keep both" just
  records the dismissal; picking a line calls `POST /api/knowledge/lint/resolve`,
  which asks the model for **verbatim find/replace edits** (not a whole-doc
  rewrite — that would truncate large docs), applies the ones that match to the
  affected source(s)' `contentOverride`, re-ingests via `ingestSource`, and
  dismisses the finding.
- **Dismiss** persists to `knowledge_lint_dismissals` (migration `0038`) so it
  stays hidden across scans — a changed fingerprint (changed content) resurfaces it.
- The lint route tolerates a **missing** dismissals table (ignores the query
  error → no filtering), so it's safe to deploy before migration `0038` is applied.
- The lint prompt is **date-aware** — it injects today's date + current year so it
  never flags the current year as "future"/stale (gpt-4o-mini otherwise assumes a
  training-cutoff year and would call a correct `© {year}` outdated).
- `SourceDrawer` shows the indexed text as a rendered **markdown preview** (via
  `marked` + the `.article` styles) with a Preview↔Edit toggle; editing → raw
  textarea → Save & re-index (`contentOverride`).

## Products vs. chunks

Product search is a **separate** index — see [commerce](commerce.md). RAG
chunks are for policy/FAQ/general content only.

_Last verified: 2026-08-10 (working tree, HomeByNB feedback round)._
