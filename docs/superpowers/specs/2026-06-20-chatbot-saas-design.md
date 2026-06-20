# ChatbotZone — Multi-Tenant Chatbot SaaS — Design Specification

**Date:** 2026-06-20
**Status:** Approved scope (MVP / core vertical slice)
**Author:** Eimantas Kudarauskas + Claude

---

## 1. Overview

ChatbotZone is a multi-tenant SaaS platform that lets a single **owner** (the operator) onboard
**client** businesses, each of whom can configure an AI chatbot, train it on their own knowledge
base, and embed it on their own website via a copy-paste widget. The chatbot answers visitor
questions using Retrieval-Augmented Generation (RAG) over the client's knowledge base.

### Goals (MVP)

- Owner logs in to an admin panel, creates client accounts (invite-only), and views per-client and
  platform-wide statistics.
- Clients log in to a portal, configure their bot, manage a knowledge base, retrieve an embed
  snippet, and review conversations, leads, and analytics.
- Visitors interact with a streaming, RAG-powered chat widget embedded on the client's site.

### Non-goals (deferred to later cycles)

- Voice (ElevenLabs TTS / OpenAI Whisper STT)
- Stripe billing / subscriptions / usage metering
- Human handoff / live agent takeover
- Client self-serve signup (MVP is owner-invite-only)
- Multi-language UI (bot can answer in any language; admin UI is English)

---

## 2. Tech Stack

| Concern            | Choice                                                            |
| ------------------ | ----------------------------------------------------------------- |
| Framework          | Next.js 15 (App Router, TypeScript, React Server Components)      |
| Styling / UI       | Tailwind CSS + shadcn/ui                                          |
| Auth               | Supabase Auth (cookie sessions via `@supabase/ssr`)               |
| Database           | Supabase Postgres + Row-Level Security                            |
| Vector store       | `pgvector` (HNSW index) in the same Postgres                      |
| File storage       | Supabase Storage (knowledge-base file uploads)                    |
| LLM / inference    | OpenAI `gpt-4o-mini` (default, configurable) via Vercel AI SDK    |
| Embeddings         | OpenAI `text-embedding-3-small` (1536 dims)                       |
| Validation         | Zod                                                               |
| Forms              | React Hook Form + Zod resolver                                    |
| Charts             | Recharts                                                          |
| Document parsing   | `pdf-parse` (PDF), `mammoth` (DOCX), readability extraction (URL) |
| Testing            | Vitest (unit) + Playwright (E2E)                                  |
| Hosting            | Vercel (app + widget) + Supabase Cloud                            |

**Rationale:** Matches the operator's existing skill set (Next.js + Supabase + OpenAI). The Vercel
AI SDK gives clean streaming and a provider abstraction so Claude/other models can be added later
without rewriting chat logic. pgvector keeps the entire stack inside Supabase — no extra vector DB
to operate.

---

## 3. Roles & Tenancy

Three conceptual layers:

1. **Owner** — platform super-admin (you). Can read all data, create/suspend organizations, send
   invites, and view global analytics.
2. **Organization** — a client account / workspace, created by the owner. Has one client user in
   MVP (schema supports multiple members for future).
3. **Bot** — belongs to an organization. An org may have multiple bots; each bot has its own config,
   knowledge base, widget public key, conversations, and leads.

### Authorization

- Roles stored on `profiles.role` (`owner` | `client`).
- **Row-Level Security (RLS)** is the primary enforcement boundary:
  - `owner` role: read access to all rows (write where it makes sense — managing orgs/invites).
  - `client` role: access strictly scoped to rows whose `org_id` is in the user's org membership.
- The **public widget** never carries a user session. It calls a separate API surface
  (`/api/chat`, `/api/widget-config`) authenticated by the bot's `public_key` and gated by a
  **domain allowlist** (CORS + server-side origin check). These endpoints use the Supabase
  **service role** server-side with explicit query scoping to a single `bot_id`.

---

## 4. Data Model

All client-facing tables carry `org_id` and are protected by RLS. Timestamps (`created_at`,
`updated_at`) on every table.

### `profiles`
Extends `auth.users`. `id (uuid, pk → auth.users)`, `role (text: owner|client)`, `full_name`,
`avatar_url`.

### `organizations`
`id`, `name`, `slug`, `status (active|suspended)`, `created_by (uuid → profiles, the owner)`.

### `organization_members`
`id`, `org_id (→ organizations)`, `user_id (→ profiles)`, `role (admin|member)`.
(MVP: one row per org. Future-proofs multi-seat.)

### `invites`
`id`, `org_id`, `email`, `token (unique)`, `status (pending|accepted|expired)`, `expires_at`,
`invited_by`.

### `bots`
`id`, `org_id`, `name`, `status (active|paused)`, `public_key (unique, used by widget)`,
`config (jsonb)`.
`config` shape:
```jsonc
{
  "displayName": "Acme Assistant",
  "avatarUrl": "...",
  "theme": { "primaryColor": "#4f46e5", "position": "bottom-right", "bubbleIcon": "chat" },
  "greeting": "Hi! How can I help?",
  "systemPrompt": "You are Acme's friendly support assistant...",
  "persona": { "tone": "friendly", "verbosity": "concise" },
  "model": "gpt-4o-mini",
  "temperature": 0.3,
  "suggestedQuestions": ["What are your hours?", "Do you ship internationally?"],
  "fallbackMessage": "I'm not sure about that — let me take your details so a human can follow up.",
  "leadCapture": {
    "enabled": true,
    "trigger": "on_fallback",          // on_fallback | after_n_messages | manual
    "fields": [{ "key": "email", "label": "Email", "required": true }]
  },
  "allowedDomains": ["acme.com", "www.acme.com"]
}
```

### `knowledge_sources`
`id`, `bot_id`, `type (file|url|qa|text)`, `name`, `status (pending|processing|ready|error)`,
`error_message`, `metadata (jsonb)` (file path, URL, char count, chunk count).

### `document_chunks`
`id`, `bot_id`, `source_id (→ knowledge_sources)`, `content (text)`, `embedding (vector(1536))`,
`token_count`, `chunk_index`. HNSW index on `embedding` (cosine).

### `conversations`
`id`, `bot_id`, `visitor_id (text, anon UUID)`, `metadata (jsonb: page_url, user_agent, referrer)`,
`started_at`, `last_message_at`.

### `messages`
`id`, `conversation_id (→ conversations)`, `role (user|assistant|system)`, `content (text)`,
`citations (jsonb: [{source_id, snippet}])`, `token_count`.

### `leads`
`id`, `bot_id`, `conversation_id`, `fields (jsonb)`, `created_at`.

### RPC / views
- `match_chunks(bot_id, query_embedding, match_count, min_similarity)` → top-k chunks by cosine
  similarity, scoped to the bot.
- `owner_stats` / `org_stats` SQL views for analytics aggregation.

---

## 5. Application Structure (Next.js App Router)

```
app/
  (auth)/
    login/                 # email+password login
    accept-invite/[token]/ # client sets password, joins org
    reset-password/
  (owner)/owner/
    page.tsx               # platform dashboard (global stats)
    clients/               # list + create client (sends invite)
    clients/[orgId]/       # per-client detail + stats + bots
  (client)/app/
    page.tsx               # bots list / overview
    bots/[botId]/
      configure/           # bot configurator + live preview
      knowledge/           # KB manager (upload, url, qa, text + status)
      conversations/       # transcript browser
      leads/               # captured leads + CSV export
      analytics/           # charts
      embed/               # copy-paste widget snippet
  embed/[publicKey]/       # the chat UI rendered inside the widget iframe
  api/
    chat/                  # POST, streaming, public, key+domain gated
    widget-config/         # GET bot public config for the widget
    ingest/                # POST, trigger/process KB source ingestion
    invites/               # owner creates invites
  layout.tsx, middleware.ts
public/
  widget.js                # loader script clients embed
lib/
  supabase/                # server + browser + service-role clients
  ai/                      # embeddings, chat, RAG retrieval
  ingestion/               # parsers + chunker + embed pipeline
  auth/                    # role guards, session helpers
components/                # shadcn/ui + app components
supabase/
  migrations/              # SQL schema + RLS policies + RPC
```

`middleware.ts` protects `/owner/*` (owner role) and `/app/*` (authenticated client), redirecting
unauthenticated users to login and wrong-role users to their correct home.

---

## 6. Knowledge Base / RAG Pipeline

### Ingestion
1. Client adds a source (upload file / paste URL(s) / enter Q&A / paste text). Row created with
   `status = pending`.
2. `/api/ingest` processes it: **extract** text (pdf-parse / mammoth / readability for URLs; Q&A and
   text are direct) → **chunk** (~500–800 tokens, ~15% overlap, sentence-aware) → **embed** each
   chunk (`text-embedding-3-small`, batched) → **insert** into `document_chunks`.
3. Status transitions `processing → ready` (or `error` with `error_message`). The KB manager polls /
   subscribes for live status.

> Vercel runtime note: ingestion runs in a Node route handler with `maxDuration` raised; large jobs
> are bounded (max file size, max URLs per batch, max pages crawled). If a job risks exceeding the
> limit it is chunked across requests. (A Supabase Edge Function / queue is a later optimization;
> not required for MVP volumes.)

### Retrieval (per chat turn)
1. Embed the incoming user message.
2. `match_chunks(bot_id, embedding, k, min_similarity)` → top-k relevant chunks.
3. Build the prompt: bot `systemPrompt` + persona + retrieved context (with source tags) + recent
   conversation history (sliding window).
4. Stream the completion from `gpt-4o-mini` (or the bot's configured model) via the Vercel AI SDK.
5. Persist user + assistant messages; attach `citations` from the chunks used.
6. If retrieval is empty/low-similarity, respond with the configured `fallbackMessage` and trigger
   lead capture if configured.

---

## 7. Widget Runtime

- **`/widget.js`** — a small loader. The client pastes:
  ```html
  <script src="https://app.chatbotzone.com/widget.js" data-bot-key="PUBLIC_KEY" async></script>
  ```
  It reads `data-bot-key`, renders a launcher bubble, and lazy-mounts an `<iframe>` →
  `/embed/{publicKey}` on first open.
- **`/embed/[publicKey]`** — the chat UI (client component). Fetches config from `/api/widget-config`,
  renders greeting + suggested questions, and streams chat via `/api/chat`. The iframe fully
  isolates host-site CSS.
- **Visitor identity** — anonymous UUID persisted in `localStorage`, sent with each request so a
  conversation survives reloads.
- **Security** — `/api/chat` and `/api/widget-config` validate `public_key`, enforce the bot's
  `allowedDomains` against the `Origin`/`Referer`, set CORS accordingly, and rate-limit per
  visitor/bot.

---

## 8. Bot Configurator (client-controlled)

A form (React Hook Form + Zod) writing to `bots.config`, with a **live preview** of the widget
beside it. Controls: display name, avatar, theme (primary color, launcher position, icon),
greeting, system prompt + tone/verbosity, model + temperature, suggested starter questions,
fallback message, lead-capture (enable, trigger, fields), and allowed domains.

---

## 9. Analytics

- **Owner dashboard:** total clients, active bots, total conversations / messages / leads, per-client
  usage table, recent activity feed.
- **Client analytics:** conversations over time, message volume, top visitor questions, leads
  captured, knowledge-base readiness, fallback (unanswered) rate.
- Implemented with SQL aggregation views; rendered with Recharts.

---

## 10. Error Handling & Reliability

- All API inputs validated with Zod; typed error responses.
- Ingestion errors captured per-source (`status=error`, `error_message`) with a manual retry action.
- `/api/chat` degrades gracefully: on retrieval or LLM failure it returns the fallback message
  rather than erroring the widget.
- Rate limiting on public endpoints (per visitor + per bot).
- Domain allowlist + key validation reject unauthorized embeds.
- Secrets (OpenAI key, Supabase service role) live only server-side in env vars.

---

## 11. Testing Strategy

- **Vitest (unit):** chunker (boundaries/overlap), retrieval prompt assembly, auth/role guards,
  Zod schemas, widget-config domain checks.
- **RLS tests:** verify a client cannot read another org's bots/conversations/leads; verify owner
  can; verify the service-role chat path is scoped to one bot.
- **Playwright (E2E):** owner creates client → invite accepted → client configures bot → ingests a
  source → embeds widget → visitor chat returns a grounded answer with citation → lead captured on
  fallback.

---

## 12. Delivery Plan (program-level)

This spec covers **Cycle 1: Foundation + Core Vertical Slice** (everything in sections 1–11).
Subsequent cycles, each with its own spec → plan → build:

- **Cycle 2 — Voice:** ElevenLabs TTS + Whisper STT in the widget.
- **Cycle 3 — Billing:** Stripe subscriptions, plans, usage limits/metering.
- **Cycle 4 — Human handoff:** realtime live-agent takeover + presence.
- **Cycle 5 — Polish:** advanced analytics, multi-seat orgs, multi-language.

### Cycle 1 build order (high level)
1. Project scaffold (Next.js, Tailwind, shadcn, Supabase clients, env, CI checks).
2. Database schema + RLS + RPC migrations.
3. Auth + roles + invite flow + route protection.
4. Owner panel (clients CRUD + invites + global stats).
5. Client portal shell + bots list + bot configurator.
6. Knowledge base ingestion pipeline (all four source types) + status UI.
7. RAG chat API (retrieval + streaming) + message/conversation persistence.
8. Embed widget (`widget.js` + `/embed` UI) + public API gating.
9. Conversations, leads, analytics views.
10. Tests (unit + RLS + E2E) + hardening.

A detailed task-level implementation plan is produced next (writing-plans).
