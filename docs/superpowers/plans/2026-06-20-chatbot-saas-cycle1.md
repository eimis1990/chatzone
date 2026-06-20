# ChatbotZone — Cycle 1 (Core Vertical Slice) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant chatbot SaaS where an owner invites clients, each client configures a RAG-powered bot trained on their knowledge base, and embeds it on their site via a widget.

**Architecture:** Next.js 15 App Router monolith on Vercel; Supabase (Postgres + Auth + Storage + pgvector) as the single backend. RLS enforces tenancy. Public widget endpoints authenticate by bot public key + domain allowlist using the service role. RAG via OpenAI embeddings + `gpt-4o-mini` streamed through the Vercel AI SDK.

**Tech Stack:** Next.js 15, TypeScript, Tailwind, shadcn/ui, @supabase/ssr, supabase-js, pgvector, Vercel AI SDK (`ai`, `@ai-sdk/openai`), Zod, React Hook Form, Recharts, pdf-parse, mammoth, Vitest, Playwright.

## Global Constraints

- **Node:** 20+. **Package manager:** npm. **Next.js:** 15.x (App Router only).
- **TypeScript strict mode** on. No `any` without an inline justification comment.
- **Embeddings:** `text-embedding-3-small`, 1536 dims. **Default chat model:** `gpt-4o-mini`.
- **All client-facing tables carry `org_id` and are protected by RLS.** No table ships without an RLS policy.
- **Secrets** (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only — never imported into a client component or `NEXT_PUBLIC_*`.
- **Every API input is validated with Zod** before use.
- **Commit after every passing step.** Conventional commit messages.
- **TDD:** write the failing test first for all non-trivial logic (chunking, retrieval, auth guards, RLS, domain checks, lead capture).

## Reference: Spec

`docs/superpowers/specs/2026-06-20-chatbot-saas-design.md` — read it before starting.

## File Structure (decomposition)

```
app/(auth)/login|accept-invite/[token]|reset-password
app/(owner)/owner/page|clients|clients/[orgId]
app/(client)/app/page|bots/[botId]/{configure,knowledge,conversations,leads,analytics,embed}
app/embed/[publicKey]/page.tsx          # widget chat UI (iframe content)
app/api/{chat,widget-config,ingest,invites}/route.ts
public/widget.js                        # embeddable loader
middleware.ts                           # route protection by role
lib/supabase/{server,browser,service,middleware}.ts
lib/auth/{guards,roles}.ts
lib/ai/{embeddings,chat,retrieval,prompt}.ts
lib/ingestion/{parse,chunk,pipeline}.ts
lib/validation/schemas.ts
lib/types.ts
components/ui/*                          # shadcn
components/{owner,client,widget}/*
supabase/migrations/*.sql               # schema + RLS + RPC
tests/unit/* tests/e2e/*
```

Files that change together live together; each `lib/*` module has one responsibility and a typed interface so tasks can consume each other by signature.

---

## PHASE 0 — Project Scaffold

**Deliverable:** A running Next.js app with Tailwind, shadcn, Supabase clients, env validation, and CI checks (lint/typecheck/test) passing.

### Task 0.1: Scaffold Next.js + Tailwind + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.env.example`, `.eslintrc`, `vitest.config.ts`
- Create: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces: a buildable app; `npm run dev|build|lint|typecheck|test` scripts.

- [ ] **Step 1:** `npx create-next-app@latest . --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"` (accept Turbopack default). Confirm it boots with `npm run dev`.
- [ ] **Step 2:** Add scripts to `package.json`: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`. Install dev deps: `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react`.
- [ ] **Step 3:** Create `vitest.config.ts` (jsdom env, `@` alias). Write `tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
describe('smoke', () => { it('adds', () => expect(1 + 1).toBe(2)) })
```
- [ ] **Step 4:** Run `npm run test` → PASS. Run `npm run typecheck` → no errors.
- [ ] **Step 5:** Create `.env.example` with: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `NEXT_PUBLIC_APP_URL`.
- [ ] **Step 6:** Commit: `chore: scaffold next.js app with tailwind, vitest, tooling`.

### Task 0.2: shadcn/ui + base layout

**Files:** Modify `app/layout.tsx`; Create `components/ui/*` (button, input, card, dialog, table, etc. via shadcn CLI), `lib/utils.ts`.

- [ ] **Step 1:** `npx shadcn@latest init` (defaults, CSS variables). Add components: `npx shadcn@latest add button input label card dialog table tabs badge sonner form select textarea switch`.
- [ ] **Step 2:** Verify build: `npm run build` → success.
- [ ] **Step 3:** Commit: `chore: add shadcn/ui and base components`.

### Task 0.3: Supabase clients + env validation

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/service.ts`, `lib/env.ts`
- Test: `tests/unit/env.test.ts`

**Interfaces:**
- Produces: `createServerClient()` (RSC/route, cookie-based), `createBrowserClient()`, `createServiceClient()` (service role, server-only), `env` (validated).

- [ ] **Step 1:** `npm i @supabase/supabase-js @supabase/ssr zod`.
- [ ] **Step 2 (test first):** `tests/unit/env.test.ts` — asserts `env` throws when a required var is missing and parses when present (mock `process.env`).
- [ ] **Step 3:** Implement `lib/env.ts` with a Zod schema over `process.env` (server vars guarded so they're only read server-side). Run test → PASS.
- [ ] **Step 4:** Implement the three Supabase client factories per `@supabase/ssr` patterns (server client wires Next cookies; service client uses `SUPABASE_SERVICE_ROLE_KEY` and is never imported client-side).
- [ ] **Step 5:** `npm run typecheck` → clean. Commit: `feat: add supabase clients and validated env`.

---

## PHASE 1 — Database Schema, RLS, RPC

**Deliverable:** Applied migrations creating all tables, RLS policies, and the `match_chunks` RPC, with RLS verified by tests against a local Supabase.

### Task 1.1: Core schema migration

**Files:** Create `supabase/migrations/0001_init.sql`, `lib/types.ts` (hand-written DB row types mirroring schema).

**Interfaces:**
- Produces tables per spec §4: `profiles, organizations, organization_members, invites, bots, knowledge_sources, document_chunks, conversations, messages, leads`. Enables `vector` + `pgcrypto` extensions. HNSW index on `document_chunks.embedding`.

- [ ] **Step 1:** Install Supabase CLI; `supabase init`; `supabase start` (local stack).
- [ ] **Step 2:** Write `0001_init.sql`: `create extension vector; create extension pgcrypto;` then all tables with FKs, enums (or text + check), `created_at/updated_at` defaults, `bots.public_key text unique default encode(gen_random_bytes(16),'hex')`, `document_chunks.embedding vector(1536)`, and `create index ... using hnsw (embedding vector_cosine_ops)`.
- [ ] **Step 3:** `supabase db reset` → migration applies cleanly. Verify tables exist (`\dt`).
- [ ] **Step 4:** Write `lib/types.ts` row types matching columns. `npm run typecheck` clean.
- [ ] **Step 5:** Commit: `feat(db): core schema with pgvector`.

### Task 1.2: RLS policies + helper

**Files:** Create `supabase/migrations/0002_rls.sql`; Test `tests/unit/rls.test.ts` (integration, runs against local Supabase).

**Interfaces:**
- Produces: a SQL helper `auth_org_ids()` / `is_owner()`; policies so `client` sees only their org rows, `owner` sees all.

- [ ] **Step 1 (test first):** `tests/rls.test.ts` — seed an owner, two orgs each with a client user + a bot; assert (via supabase-js with each user's JWT) client A cannot select org B's bot, owner can select both, and an anon client is blocked.
- [ ] **Step 2:** Run test → FAIL (no policies yet).
- [ ] **Step 3:** Write `0002_rls.sql`: `enable row level security` on every table; `is_owner()` (checks `profiles.role='owner'`) and `auth_org_ids()` (orgs where `organization_members.user_id = auth.uid()`); select/insert/update/delete policies scoping client tables by `org_id in (select auth_org_ids())` OR `is_owner()`. `document_chunks/messages/conversations/leads` scope via their parent `bot_id`'s org.
- [ ] **Step 4:** `supabase db reset`; run RLS test → PASS.
- [ ] **Step 5:** Commit: `feat(db): row-level security policies`.

### Task 1.3: `match_chunks` RPC + stats views

**Files:** Create `supabase/migrations/0003_rpc.sql`; Test `tests/unit/match_chunks.test.ts`.

**Interfaces:**
- Produces: `match_chunks(p_bot_id uuid, p_query_embedding vector(1536), p_match_count int, p_min_similarity float) returns table(id uuid, content text, source_id uuid, similarity float)` — security definer, filters by `bot_id`. Plus views `owner_stats`, `org_stats`.

- [ ] **Step 1 (test first):** insert 3 chunks with known embeddings for a bot; assert `match_chunks` returns them ordered by cosine similarity, respects `p_match_count` and `p_min_similarity`, and never returns another bot's chunks.
- [ ] **Step 2:** Run → FAIL. Implement RPC + views. Run → PASS.
- [ ] **Step 3:** Commit: `feat(db): match_chunks rpc and stats views`.

---

## PHASE 2 — Auth, Roles, Invites, Route Protection

**Deliverable:** Owner and client can log in; middleware routes each role to its area; owner can create an org + invite; invite acceptance sets a password and joins the org. (Covers spec §3, §5 middleware, §4 invites.)

### Task 2.1: Auth helpers + role guards

**Files:** Create `lib/auth/roles.ts`, `lib/auth/guards.ts`; Test `tests/unit/guards.test.ts`.

**Interfaces:**
- Produces: `getSessionUser()` → `{ user, profile } | null`; `requireRole(role)` (throws/redirects); `getUserOrgIds()`.

- [ ] Test-first the role-guard logic (mock supabase client returning profiles with each role), implement, pass, commit. (`feat(auth): session + role guards`)

### Task 2.2: middleware route protection

**Files:** Create `middleware.ts`, `lib/supabase/middleware.ts`; Test `tests/unit/middleware.test.ts`.

**Interfaces:**
- Consumes: server supabase client. Produces: redirects — unauthenticated → `/login`; `client` hitting `/owner/*` → `/app`; `owner` hitting `/app/*` → `/owner`.

- [ ] Test-first the redirect matrix, implement using `@supabase/ssr` middleware pattern, pass, commit.

### Task 2.3: Login + reset pages

**Files:** Create `app/(auth)/login/page.tsx`, `app/(auth)/reset-password/page.tsx`, `components/auth/*`.

- [ ] Build email+password login (supabase-js), error states, redirect by role on success. Manual smoke (documented steps). Commit. (`feat(auth): login and reset-password pages`)

### Task 2.4: Invite create + accept flow

**Files:** Create `app/api/invites/route.ts`, `app/(auth)/accept-invite/[token]/page.tsx`, `lib/validation/schemas.ts` (invite schema); Test `tests/unit/invites.test.ts`.

**Interfaces:**
- Consumes: service client, `requireRole('owner')`. Produces: POST `/api/invites` `{email, orgName}` → creates org + member-less invite row with token; accept page validates token, creates the auth user (or sets password), inserts `organization_members`, marks invite accepted.

- [ ] Test-first invite token validation/expiry logic; implement API + accept page; pass; commit. (`feat(auth): owner invites and client acceptance`)

---

## PHASE 3 — Owner Panel

**Deliverable:** Owner dashboard with global stats, clients list, create-client (triggers invite), and per-client detail with stats. (Spec §5 owner routes, §9 owner analytics.)

### Task 3.1: Owner dashboard (global stats)
**Files:** `app/(owner)/owner/page.tsx`, `components/owner/StatCards.tsx`, query helpers reading `owner_stats`.
- [ ] Server component reads `owner_stats` view; renders cards (clients, active bots, conversations, messages, leads) + recent activity. Commit.

### Task 3.2: Clients list + create
**Files:** `app/(owner)/owner/clients/page.tsx`, `components/owner/CreateClientDialog.tsx`.
- [ ] List orgs (name, status, bot count, last activity); "Add client" dialog posts to `/api/invites`. Commit.

### Task 3.3: Client detail + stats
**Files:** `app/(owner)/owner/clients/[orgId]/page.tsx`.
- [ ] Per-org stats (reads `org_stats`), bots in org, suspend/activate action. Commit.

---

## PHASE 4 — Client Portal Shell + Bot Configurator

**Deliverable:** Client sees their bots, creates a bot, and configures it with a live preview. (Spec §8.)

### Task 4.1: Portal shell + bots list + create bot
**Files:** `app/(client)/app/page.tsx`, `app/(client)/app/layout.tsx` (nav), `components/client/CreateBotDialog.tsx`.
- [ ] Server component lists the org's bots; create-bot inserts a row with default `config` + generated `public_key`. Commit.

### Task 4.2: Config Zod schema + bot config types
**Files:** `lib/validation/schemas.ts` (extend with `botConfigSchema`), `lib/types.ts` (BotConfig type); Test `tests/unit/botConfig.test.ts`.
**Interfaces:** Produces `botConfigSchema` matching spec §4 `config` JSON; `BotConfig` type consumed by configurator, widget-config API, and chat API.
- [ ] Test-first schema (valid/invalid configs, defaults); implement; pass; commit.

### Task 4.3: Configurator form + live preview
**Files:** `app/(client)/app/bots/[botId]/configure/page.tsx`, `components/client/ConfigForm.tsx`, `components/widget/ChatPreview.tsx`.
- [ ] RHF + `botConfigSchema` form (name, avatar, theme, greeting, system prompt, tone, model, temperature, suggested questions, fallback, lead-capture fields, allowed domains); save to `bots.config`; live `ChatPreview` reflects config. Commit.

---

## PHASE 5 — Knowledge Base Ingestion

**Deliverable:** All four source types ingest into `document_chunks` with live status; errors surfaced + retryable. (Spec §6 ingestion.)

### Task 5.1: Chunker
**Files:** `lib/ingestion/chunk.ts`; Test `tests/unit/chunk.test.ts`.
**Interfaces:** Produces `chunkText(text: string, opts?: {maxTokens?: number; overlap?: number}): {content: string; index: number}[]` — sentence-aware, ~500–800 tokens, ~15% overlap.
- [ ] Test-first (short text → 1 chunk; long text → multiple with overlap; respects sentence boundaries; empty → []). Implement (token estimate via char heuristic or `gpt-tokenizer`). Pass. Commit.

### Task 5.2: Parsers
**Files:** `lib/ingestion/parse.ts`; Test `tests/unit/parse.test.ts`.
**Interfaces:** Produces `parseFile(buffer, mime): Promise<string>` (PDF via pdf-parse, DOCX via mammoth, txt/md direct) and `parseUrl(url): Promise<string>` (fetch + readability extraction).
- [ ] `npm i pdf-parse mammoth @mozilla/readability jsdom`. Test-first with small fixtures; implement; pass; commit.

### Task 5.3: Embeddings client
**Files:** `lib/ai/embeddings.ts`; Test `tests/unit/embeddings.test.ts` (mock OpenAI).
**Interfaces:** Produces `embed(texts: string[]): Promise<number[][]>` (batched, `text-embedding-3-small`).
- [ ] `npm i ai @ai-sdk/openai`. Test-first (batching, dim=1536, mocked); implement; pass; commit.

### Task 5.4: Ingestion pipeline + API
**Files:** `lib/ingestion/pipeline.ts`, `app/api/ingest/route.ts`; Test `tests/unit/pipeline.test.ts`.
**Interfaces:** Consumes `parse*`, `chunkText`, `embed`. Produces `ingestSource(sourceId)`: sets `processing` → parse → chunk → embed → insert chunks → `ready`/`error`. API POST `/api/ingest {sourceId}` (auth: org owns the bot).
- [ ] Test-first pipeline state transitions (mock parse/embed/db); implement; pass; commit.

### Task 5.5: KB manager UI
**Files:** `app/(client)/app/bots/[botId]/knowledge/page.tsx`, `components/client/{FileUpload,UrlSource,QaSource,TextSource,SourceList}.tsx`.
- [ ] Upload (Supabase Storage) + URL/QA/text forms create `knowledge_sources` rows and call `/api/ingest`; `SourceList` shows live status (poll or realtime) with retry/delete. Commit.

---

## PHASE 6 — RAG Chat API

**Deliverable:** `/api/chat` retrieves context and streams a grounded answer, persisting messages + citations, with fallback + lead-capture triggers. (Spec §6 retrieval, §7 security.)

### Task 6.1: Retrieval + prompt assembly
**Files:** `lib/ai/retrieval.ts`, `lib/ai/prompt.ts`; Test `tests/unit/retrieval.test.ts`, `tests/unit/prompt.test.ts`.
**Interfaces:** Produces `retrieveContext(botId, query, k): Promise<{chunks; isWeak: boolean}>` (embeds query → `match_chunks`); `buildMessages(config, contextChunks, history, userMsg): CoreMessage[]` (system prompt + persona + tagged context + sliding-window history).
- [ ] Test-first both (weak-retrieval flag at min-similarity threshold; prompt includes system prompt + citations tags + bounded history). Implement. Pass. Commit.

### Task 6.2: Chat route (streaming + persistence + gating)
**Files:** `app/api/chat/route.ts`, `lib/ai/chat.ts`, `lib/validation/schemas.ts` (chat request schema); Test `tests/unit/chat-guard.test.ts`.
**Interfaces:** Consumes `retrieveContext`, `buildMessages`, service client. POST `/api/chat {publicKey, visitorId, conversationId?, message}` → validates key + `Origin` against `allowedDomains` (CORS), rate-limits, creates/loads conversation, streams via `streamText({model: openai(config.model), messages})`, persists user+assistant messages + citations on finish; on weak retrieval uses `fallbackMessage` and flags lead capture.
- [ ] Test-first the domain/key gate + rate-limit logic (unit, mocked); implement route; verify streaming via local curl; commit.

---

## PHASE 7 — Embed Widget

**Deliverable:** A `<script>` snippet renders a launcher + iframe chat that talks to `/api/chat`; visitor identity persists; conversations log. (Spec §7.)

### Task 7.1: widget-config API
**Files:** `app/api/widget-config/route.ts`; Test `tests/unit/widget-config.test.ts`.
**Interfaces:** GET `/api/widget-config?key=PUBLIC_KEY` → returns public-safe config subset (theme, greeting, suggested questions, display name, lead-capture fields) after domain check. Never returns system prompt or allowed-domains internals.
- [ ] Test-first (valid key returns safe subset; bad key 404; system prompt absent). Implement. Pass. Commit.

### Task 7.2: Embed chat UI
**Files:** `app/embed/[publicKey]/page.tsx`, `components/widget/{ChatWindow,MessageList,Composer,LeadForm,SuggestedQuestions}.tsx`.
- [ ] Iframe-targeted chat: fetch widget-config, render greeting + suggested questions, stream answers from `/api/chat` (AI SDK `useChat` or manual fetch-stream), persist `visitorId` in localStorage, show `LeadForm` when fallback/lead trigger fires. Commit.

### Task 7.3: widget.js loader
**Files:** Create `public/widget.js`; Test `tests/unit/widget-loader.test.ts` (jsdom).
**Interfaces:** Reads `data-bot-key` from its own `<script>` tag, injects a launcher button + lazy iframe to `${APP_URL}/embed/{key}`, toggles open/close, passes parent origin.
- [ ] Test-first (script reads key, creates launcher, lazy-mounts iframe on click); implement vanilla JS (no build step); pass; commit.

### Task 7.4: Embed snippet page
**Files:** `app/(client)/app/bots/[botId]/embed/page.tsx`.
- [ ] Show copy-paste `<script>` snippet with the bot's public key + install instructions; copy button. Commit.

---

## PHASE 8 — Conversations, Leads, Analytics

**Deliverable:** Client can browse transcripts, view/export leads, and see analytics charts. (Spec §9 client analytics.)

### Task 8.1: Conversations browser
**Files:** `app/(client)/app/bots/[botId]/conversations/page.tsx`, `components/client/TranscriptView.tsx`.
- [ ] List conversations (last message, message count, time); open transcript with messages + citations. Commit.

### Task 8.2: Leads + CSV export
**Files:** `app/(client)/app/bots/[botId]/leads/page.tsx`, `lib/csv.ts`; Test `tests/unit/csv.test.ts`.
- [ ] Test-first CSV serialization; list leads (dynamic columns from `fields`); export button. Commit.

### Task 8.3: Client analytics
**Files:** `app/(client)/app/bots/[botId]/analytics/page.tsx`, `components/client/charts/*`.
- [ ] Recharts: conversations over time, message volume, top questions, leads captured, KB readiness, fallback rate (from `org_stats` + targeted queries). Commit.

---

## PHASE 9 — Hardening & E2E

**Deliverable:** Rate limiting verified, full E2E green, README + deployment notes.

### Task 9.1: Rate limiting
**Files:** `lib/ratelimit.ts` (in-memory + pluggable); Test `tests/unit/ratelimit.test.ts`. Wire into `/api/chat`, `/api/ingest`.
- [ ] Test-first token-bucket per (bot, visitor); implement; pass; commit.

### Task 9.2: Playwright E2E happy path
**Files:** `tests/e2e/full-flow.spec.ts`, `playwright.config.ts`.
- [ ] `npm i -D @playwright/test`. Scenario: owner creates client → accept invite → client creates+configures bot → ingest a text source → open `/embed/{key}` → send message → receive grounded answer with citation → trigger fallback → submit lead → lead appears in portal. Commit.

### Task 9.3: README + deploy notes
**Files:** `README.md`, `docs/DEPLOY.md`.
- [ ] Setup, env vars, Supabase migration apply, Vercel deploy, widget install. Commit.

---

## Self-Review (completed)

- **Spec coverage:** §1 goals → Phases 2–8; §2 stack → Phase 0; §3 tenancy/RLS → Phases 1.2, 2; §4 data model → Phase 1; §5 routes → Phases 2–8; §6 RAG → Phases 5–6; §7 widget → Phase 7; §8 configurator → Phase 4; §9 analytics → Phases 3.1/3.3/8.3; §10 error handling → spread (ingest errors 5.4, chat fallback 6.2, rate limit 9.1, domain gate 6.2/7.1); §11 testing → unit throughout + RLS 1.2 + E2E 9.2. No gaps.
- **Placeholders:** none — UI-heavy tasks state exact files + deliverables; logic tasks are TDD with named interfaces. (Execution agents write full code per task under subagent-driven-development.)
- **Type consistency:** `BotConfig`/`botConfigSchema` (4.2) consumed by 4.3, 6.1, 6.2, 7.1; `chunkText`, `embed`, `parseFile/parseUrl`, `match_chunks`, `retrieveContext`, `buildMessages` signatures referenced consistently across consumers.
```
