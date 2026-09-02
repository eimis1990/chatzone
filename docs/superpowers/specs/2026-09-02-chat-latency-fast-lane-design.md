# Chat latency: plumbing pass + fast lane

Date: 2026-09-02 · Status: approved direction (owner: "create branch and let's do it")

## Problem

A suggested-question chip ("returns policy") takes as long as a product hunt.
Every visitor message walks the same path in `app/api/chat/route.ts`:

1. ~8 sequential DB round trips before the model is contacted (bot, block,
   conversation, recent visitor messages, message insert, conversation update,
   history, component folders). Only the conversation id is a real dependency.
2. Retrieval (OpenAI embedding + `match_chunks_hybrid`) runs after all of them,
   though it only needs the bot id and the message.
3. Always gpt-4.1 with the full prompt (system + security + warmth + 5 chunks +
   40 turns + product tools). Time-to-first-token alone is seconds.
4. Commerce bots always carry `search_products`/`display_products`, so a
   returns question can become a multi-step tool loop (cap 14).

We have no timing data, so which bucket dominates is a guess.

## Scope (two commits on `perf/chat-fast-lane`)

### Commit 1 — measure + free plumbing (no behaviour change)

- One `[chat] timing` log line per request: `pre` (before retrieval could
  start), `retrieval`, `ttft`, `total`, `toolSteps`, `model`, `lane`.
  Route logs the pre-model part; `ndjsonChatResponse` logs ttft/total/steps.
- Kick off `retrieveContext` right after the bot resolves and the origin is
  allowed; await it where it is used today. A blocked/rate-limited/handoff
  turn wastes one embedding call — acceptable.
- Run the independent reads in one `Promise.all`: active block, conversation
  lookup, recent visitor messages, history, component folders.
- History is loaded BEFORE the user message is inserted, so the
  `.slice(0, -1)` that dropped the just-inserted row is removed. History is
  discarded when the conversation lookup rejects the id (spoofed id → no
  leak).
- User-message insert and `last_message_at` update run in parallel; both are
  still awaited (Vercel may suspend after the response closes).
- Prompt content, model, retrieval thresholds: untouched. Answers identical.

### Commit 2 — fast lane behind a per-bot flag (default off)

- `botConfigSchema.fastLane: boolean` (default `false`). No UI in this pass;
  the owner flips it in the bot config. Not exposed to clients.
- Decision AFTER retrieval, no extra model call:
  `fastLane && topSimilarity >= FAST_LANE_SIMILARITY (0.40) && !looksLikeProductIntent(message)`
  → **no tools**, the plain KB prompt (commerce block omitted), **same model**.
  Anything else → the exact path we ship today.
- Model swap dropped after measuring (2026-09-02, same prompt, 3 runs each):
  gpt-4.1 ttft 0.56–0.90s; gpt-4.1-mini 0.93–1.39s; gpt-4.1-nano 0.97–1.98s;
  gpt-4o-mini 0.58–1.88s. The big model is the fastest to first token, so the
  lane only removes tools and the commerce prompt.
- `looksLikeProductIntent`: cheap keyword/regex check in both languages
  (price, buy, order, product, "kiek kainuoja", "ar turite", etc.) plus "the
  conversation is currently showing product cards". Errs toward the slow lane.
- `lane` appears in the timing log so we can see hit rate and misroutes.
- Rollout: merge flag-off → enable on the 3IMIS test copy → run
  `scripts/eval-answers.mjs` → enable for HomeByNB → revert is a config edit.

## Findings from the first measurements (local dev → prod DB, 2026-09-02)

| phase | FAQ turn | note |
|---|---|---|
| pre (DB rounds before the model) | 0.6–1.1s | ~5 sequential PostgREST rounds at ~100ms each from Vilnius |
| retrieval wait | 0ms | fully overlapped with the DB work after commit 1 |
| rewrite path (elliptical follow-up) | +1.4s | gpt-4o-mini rewrite + second embed/match, sequential |
| model ttft after pre | 1.0–1.5s | gpt-4.1, prompt-cached |
| gift-card question | 12–14s ttft | 2 `search_products` calls; by design a product |

**Region:** production functions run in `iad1` (x-vercel-id `fra1::iad1::…`)
while the Supabase project is `eu-central-1`. Every DB round trip crosses the
Atlantic. Pinning functions to `fra1` is the cheapest remaining win and is
part of this branch (commit 3).

## Out of scope (decide after we have timing data)

- Client-authored "Quick answers" section on the knowledge screen.
- Per-bot answer cache for suggested-question chips on fresh conversations.
- Trimming the system prompt for the fast lane.
- Caching `assignedComponents` (the file already notes it as the upgrade path).

## Risk

Commit 1 changes order, not output. The only trap was the history slice; the
spec above removes it explicitly. Commit 2 can misroute a product question to
a tool-less small model — hence the per-bot flag, product-intent guard, and
test-bot-first rollout.
