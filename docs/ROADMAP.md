# Chatzone — Roadmap: closing the competitive gaps

Specs, plan, and task checklists for the gaps identified vs. Neria (Parnidia).
Scope: **Human handoff, Conversation intelligence, Transactional skills, Broaden
commerce, More languages, Compliance posture.** Explicitly **out of scope for
now:** WhatsApp/omnichannel and the go‑to‑market work (pricing/case studies).

Conventions used below map to the current codebase: Next.js App Router +
Supabase (Postgres, RLS, Realtime, Storage, pgvector) + OpenAI + ElevenLabs.
Key tables today: `orgs`, `profiles`, `bots` (`config` jsonb, `public_key`,
`status`, `elevenlabs_agent_id`), `conversations`, `messages`, `leads`,
`knowledge_sources`, `platform_settings`. Bot config lives in `bots.config`
(server-side) and a redacted subset is exposed via `lib/widget-config.ts`.

Effort key: **S** ≈ 1–2 days · **M** ≈ 3–6 days · **L** ≈ 1.5–3 weeks.

---

## Recommended sequence

| Phase | Feature | Why here | Effort |
| --- | --- | --- | --- |
| 1 | **Conversation intelligence** (#3) | Pure upside on data we already store; no deps; unlocks analytics parity fast | M |
| 1 | **Compliance — technical bits** (#7a) | Retention/export/delete are low‑risk and partly prerequisites for everything else | M |
| 2 | **Human handoff + agent inbox** (#1) | Highest table‑stakes gap; biggest build; needs Realtime groundwork | L |
| 3 | **Transactional skills** (#4) | Extends the existing commerce + tool framework | M |
| 4 | **More languages** (#6) | Architecture already generalizes; mostly UI + enum | M |
| 5 | **Broaden commerce** (Shopify + feed) (#5) | Larger; do when onboarding non‑WooCommerce clients | L |
| ongoing | **Compliance — policy/SOC2 roadmap** (#7b) | Process, not a build; document + prepare | S (doc) |

Phases 1 can run in parallel. Phase 2 is the critical path. Everything else is
independent and can be reordered by customer demand.

---

## 1 · Human handoff + agent inbox  `[L]`

**Goal.** Let a human take over a live conversation, with an inbox where client
staff see and answer conversations in real time. The bot pauses while a human is
handling, and can hand back.

**Scope (MVP).**
- Escalation triggers: (a) visitor taps "Talk to a person", (b) bot escalates
  after N consecutive fallbacks or on a "human/agent/complaint" intent.
- A conversation state machine: `bot → requested → live → resolved`.
- Agent **Inbox** page (per the new sidebar): list of conversations with a
  "needs human" badge, open a thread, reply, and "hand back to bot / resolve".
- Widget: when `live`, show "You're chatting with {name}", poll for human
  replies, hide suggested questions; bot does **not** auto-reply.
- Realtime for the **agent** side (authenticated → Supabase Realtime). Widget
  side uses **polling** (visitors are unauthenticated; avoids exposing Realtime).

**Out of scope (now).** Multi-agent assignment rules, canned responses, SLA
timers, email/Slack notifications (add later), typing indicators.

**Data model.**
- `conversations`: add `handoff_status` text default `'bot'`
  (`bot|requested|live|resolved`), `assigned_to uuid null → profiles.id`,
  `handoff_requested_at timestamptz null`.
- `messages`: add `from_human boolean default false` (assistant messages from a
  human agent vs. the bot). Keep `role` as-is (`user|assistant`).
- RLS: agents can select/update conversations + messages only for bots in their
  org (mirror existing bot RLS). Public widget poll endpoint is scoped by
  `public_key` + `conversation_id` (no auth, like `/api/chat`).

**Backend.**
- `/api/chat`: if `handoff_status = 'live'`, store the visitor message and return
  **no** bot reply (skip LLM); if `requested`, same. Add escalation detection
  (fallback counter on the conversation, or intent keyword) → set `requested`.
- `POST /api/widget/poll` `{ publicKey, conversationId, afterMessageId }` →
  returns new messages + current `handoff_status` (widget calls every ~4s while
  not `bot`).
- `GET /api/agent/conversations?botId&filter=needs_human|live|all` (authed).
- `POST /api/agent/messages` `{ conversationId, content }` → inserts an
  assistant message with `from_human=true`, sets `live` + `assigned_to`.
- `POST /api/agent/handoff` `{ conversationId, action: take|resolve|return }`.

**Frontend.**
- Widget (`ChatWindow`): "Talk to a person" affordance (or auto banner on
  escalation); `live` banner; polling loop; suppress bot UI affordances.
- New **Inbox** sidebar item + page: conversation list (Realtime), thread view,
  reply composer, take/resolve/return controls, unread badge in the sidebar.

**Acceptance criteria.**
- Visitor escalates → appears in the inbox within ≤5s.
- Agent reply reaches the widget within one poll interval (~4s).
- While `live`, the bot never auto-replies; "resolve" returns control to the bot.
- An agent in org A cannot see org B's conversations.

**Tasks.**
- [x] Migration: `handoff_status`, `assigned_to`, `handoff_requested_at` on
      `conversations`; `from_human` on `messages`; RLS policies. _(0010_handoff.sql:
      member UPDATE on conversations + INSERT on messages; tables added to the
      `supabase_realtime` publication; `replica identity full` on conversations.)_
- [x] `/api/chat` handoff branch + escalation detector. _(Suppresses the bot
      while `requested`/`live`; resets `resolved`→`bot` on a new turn; escalates
      on human-intent keywords and on a repeat fallback; `x-handoff` header.)_
- [x] `/api/widget/poll` (public, scoped) returning new human messages + status +
      agent name; plus `/api/widget/request-handoff`.
- [x] Widget: "Talk to a person" affordance, `requested`/`live` banner, 4s poll
      loop, bot-reply suppression, distinct human-agent bubbles.
- [x] Agent write paths. _Implemented as authenticated **server actions**
      (`loadThread`/`loadList`/`sendAgentMessage`/`handoffAction`) on the Inbox
      page rather than `/api/agent/*` routes — matches the codebase's existing
      server-action pattern (Conversations page) and is RLS-scoped._
- [x] Inbox page + sidebar entry + Supabase Realtime subscription + unread badge
      (+ 8s polling fallback if the socket is unavailable).
- [x] Tests: state machine transitions + intent detection (`tests/unit/handoff.test.ts`).

---

## 3 · Conversation intelligence  `[M]`

**Goal.** Match (and beat) their analytics: per-conversation summaries, topic
trends, CSAT/feedback, an AI-accuracy proxy, and a "needs attention" queue —
mostly analysis over data we already store.

**Scope.**
- Thumbs up/down on bot replies in the widget (we removed the TTS button; this
  reuses that slot).
- Per-conversation **summary** + **topics** generated by the LLM, cached in the DB.
- Analytics additions: CSAT %, thumbs-down rate, fallback rate (= AI-accuracy
  proxy), top topics over time.
- "Needs attention" filter on the Conversations page: fallbacks, thumbs-down,
  escalations.

**Out of scope (now).** Real ground-truth accuracy scoring, sentiment per
message, automated retraining suggestions.

**Data model.**
- `messages`: add `feedback text null` (`up|down`) on assistant messages.
- `conversations`: add `summary text null`, `topics text[] null`,
  `analyzed_at timestamptz null`, `had_fallback boolean default false`.

**Backend.**
- `POST /api/feedback` (public, scoped by `publicKey`): set `messages.feedback`;
  rate-limited.
- `analyzeConversation(conversationId)` in `lib/ai/`: LLM call → `{ summary,
  topics[] }`; persist + stamp `analyzed_at`. Run lazily when a client opens a
  conversation (if `analyzed_at` is null/stale) and/or via a daily Vercel Cron
  over recently-ended conversations.
- Mark `had_fallback` when `/api/chat` returns the fallback message.
- Analytics queries: CSAT = up / (up+down); fallback rate; topic counts by day.

**Frontend.**
- Widget/playground: thumbs up/down under completed bot messages → `/api/feedback`.
- Conversations page: show summary + topic chips per conversation; "Needs
  attention" filter.
- Analytics page: add AI-accuracy/CSAT stat cards, a feedback breakdown, and a
  topic-trend chart (reuse the existing chart components).

**Acceptance criteria.**
- Thumbs persist and appear in analytics.
- Opening a conversation shows a summary + topics (generated once, cached).
- Analytics shows CSAT %, fallback rate, and top topics.

**Tasks.**
- [ ] Migration: `feedback` on `messages`; `summary/topics/analyzed_at/had_fallback`
      on `conversations`.
- [ ] `/api/feedback` + widget thumbs UI.
- [ ] `analyzeConversation` + lazy trigger on view + optional daily cron.
- [ ] Set `had_fallback` in `/api/chat`.
- [ ] Conversations page: summary/topics + "needs attention" filter.
- [ ] Analytics: CSAT/accuracy cards + topic-trend chart.
- [ ] Tests: feedback write, CSAT/fallback math, analyze caching.

---

## 4 · Transactional skills  `[M]`

**Goal.** The agent can look up **order status** and deliver **discount codes**
(in chat and voice). Bookings/reservations deferred.

**Scope (MVP).**
- `order_status` tool: visitor provides order number **and** email; we query the
  WooCommerce **REST** API (auth'd, unlike the public Store API used for search)
  and return status, items, total, and tracking if present.
- `discount_code` tool: returns a configured coupon (static per bot, or created
  via WooCommerce coupons API) on discount intent.
- Wire both into the text tool set (`lib/ai/commerce-tool.ts`) and the voice
  client tool path.

**Out of scope (now).** Reservations/bookings, payment capture, returns/RMA.

**Security.** Order lookups must verify identity — require order id **+**
matching email; never return an order on a mismatch; rate-limit per conversation.

**Data model.**
- `bots.config.commerce`: add `restKey`, `restSecret` (WooCommerce REST consumer
  key/secret — server-side only, never in `widget-config`), and
  `discount: { enabled, code, description }`.

**Backend.**
- `lib/commerce/woocommerce.ts`: `getOrderStatus(config, { orderId, email })`
  via `/wp-json/wc/v3/orders` (Basic auth with key/secret); normalize the result.
- `lib/commerce/index.ts`: `getOrderStatus(provider, …)` dispatch.
- Add `order_status` + `discount_code` tools (text + voice). Update prompts so
  the agent asks for order id + email before calling `order_status`.

**Frontend.**
- Configurator → Commerce: REST key/secret inputs (+ "Test connection"), discount
  code config (enable, code, description).
- Optional: an order-status "card" in chat; otherwise the agent speaks/writes it.

**Acceptance criteria.**
- Order id + matching email → correct status; mismatch → safe refusal.
- "Do you have a discount?" → configured coupon delivered.
- Works in both text and voice.

**Tasks.**
- [x] Config: REST creds + discount fields; redacted from public config. _(commerce.restKey/restSecret/discount; publicBotConfig omits commerce entirely.)_
- [x] `getOrderStatus` (WooCommerce REST) + identity check + normalization. _(lib/commerce: getWooOrderStatus gated by order id + matching billing email; getDiscount; orderLookupEnabled.)_
- [x] Tests: identity match/mismatch, 404/error, missing-creds guard, discount delivery. _(tests/unit/order.test.ts — 11 tests.)_
- [x] `order_status` + `discount_code` tools (**text** chat) + prompt updates. _(lib/ai/commerce-tool.ts + prompt.ts; gated by REST creds / configured discount.)_
- [x] Configurator UI (REST creds + "Test order access" + discount fields). _(/api/commerce/validate mode:'orders'.)_
- [x] **Voice** client-tools for order_status/discount_code. _(ElevenLabs order/discount client tools gated by config; agent hash → v8; VoiceCallButton clientTools; widget+preview order/discount endpoints.)_
- [x] Order-status **card** in chat + voice. _(NDJSON {t:'order'} → OrderStatusCard.)_

**Phase 3 complete.** ✅ (Reservations/bookings + Shopify/feed remain out of scope here.)

---

## 6 · More languages  `[M]`

**Goal.** Support locales beyond EN/LT. The runtime already generalizes
(`content.{lang}`, `voices.{lang}`, ElevenLabs per-session voice override + the
visitor language switcher); the work is the type/enum, content management UI, and
voice mapping.

**Scope.**
- Extend `BotLanguage` and the Zod enums to a curated set (e.g. add `es, de, fr,
  pl, ru, it` — pick by demand). Note: ElevenLabs `language_presets` rejects `lt`
  but accepts most of these; keep the per-session voice override (works for all).
- Configurator: replace the EN-fixed + LT-toggle with an "add/remove languages"
  manager and per-language content tabs.
- Optional: one-click LLM **auto-translate** to scaffold a new language's
  greeting/suggested questions/fallback from English.

**Out of scope (now).** RTL layout polish (ar/he), automatic visitor-language
detection beyond the existing browser-locale guess.

**Data model.** `BotLanguage` union extension; `content`/`voices` already keyed
by language. No table changes.

**Backend.**
- Extend `lib/types.ts` `BotLanguage` + `lib/validation/schemas.ts` enums.
- ElevenLabs agent: `supported_voices`/voice override already per-language — just
  ensure new languages flow through `buildAgentConfig`.
- Optional: `POST /api/preview/translate` `{ from, to, fields }` → LLM translation.

**Frontend.**
- ConfigForm language section → multi-language manager (enable list, per-language
  content tabs, per-language voice pickers — VoiceSection already loops enabled
  languages). Widget switcher already renders `languages[]`.

**Acceptance criteria.**
- Enable e.g. Spanish + German, set content + voices; widget switches; voice uses
  the right voice; text replies respect the active language.

**Tasks.**
- [ ] Extend `BotLanguage` enum + schemas + `LANG_LABELS` everywhere referenced.
- [ ] Configurator: language add/remove manager + per-language content tabs.
- [ ] Confirm `buildAgentConfig` voice/preset handling for each new language.
- [ ] (Optional) auto-translate endpoint + "Translate from English" button.
- [ ] Tests: schema accepts new langs; agent config builds per-language voices.

---

## 5 · Broaden commerce — Shopify + generic feed  `[L]`

**Goal.** Support non-WooCommerce stores: Shopify (Storefront API) and a generic
product **feed** (CSV/XML/JSON URL) ingested into our DB.

**Scope.**
- Provider abstraction: `CommerceProvider = 'woocommerce' | 'shopify' | 'feed'`.
- Shopify: Storefront GraphQL product search (store domain + Storefront token).
- Feed: fetch + parse a product feed on a schedule into a `products` table;
  search via Postgres (ILIKE) or pgvector embeddings for semantic match.
- `searchStore()` dispatches by provider; product cards unchanged.

**Out of scope (now).** Shopify order/admin operations, BigCommerce/Magento,
real-time inventory webhooks.

**Data model.**
- `bots.config.commerce.provider` extended; provider fields: shopify
  `{ storeDomain, storefrontToken }`, feed `{ feedUrl, format, fieldMap }`.
- New `products` table (feed only): `bot_id, external_id, title, price, currency,
  url, image_url, in_stock, description, embedding vector, updated_at`; unique
  `(bot_id, external_id)`; RLS by bot org.

**Backend.**
- `lib/commerce/shopify.ts`: Storefront product search → normalize to
  `CommerceProduct`.
- `lib/commerce/feed.ts`: fetch + parse (CSV/XML/JSON) → upsert `products`;
  search (ILIKE and/or pgvector).
- `lib/commerce/index.ts`: `searchStore` + `validateStore` dispatch for all three.
- Feed refresh: Vercel Cron re-ingests enabled feed bots (and on-demand "sync now").

**Frontend.**
- Configurator → Commerce: provider select + per-provider fields + validate/sync.

**Acceptance criteria.**
- A Shopify store and a feed store each return correct product cards in chat +
  voice; switching provider in config takes effect after validate/sync.

**Tasks.**
- [ ] Extend provider type + config schema + `widget-config` passthrough.
- [ ] `shopify.ts` (Storefront search) + validate.
- [ ] `products` table + migration + RLS; `feed.ts` ingest + parser(s).
- [ ] Feed search (ILIKE + optional embeddings) + dispatch in `index.ts`.
- [ ] Cron + "Sync now"; configurator provider UI.
- [ ] Tests: per-provider normalization, feed parse/upsert, dispatch.

---

## 7 · Compliance posture  `[M] + ongoing`

**Goal.** Earn buyer trust: real data controls now, and a documented path toward
SOC 2/GDPR maturity. We will **build** the technical controls; certification
itself is a separate audit process (out of build scope).

**Scope — buildable now (7a).**
- **Data retention**: per-org/bot `retention_days`; a cron purges conversations +
  messages older than the window.
- **Data export**: per-org export of conversations/leads (JSON/CSV).
- **Data deletion**: delete a bot's conversations/leads/knowledge on demand
  (right-to-erasure), plus full bot delete.
- **Subprocessor + privacy page**: list OpenAI, ElevenLabs, Supabase, Vercel; a
  public privacy/data-handling page; a widget consent line (configurable).
- **Confirm fundamentals**: secrets server-side only, RLS coverage, encryption in
  transit (already true) — document them.

**Scope — documentation/process (7b, ongoing).**
- A `docs/SECURITY.md` (data flows, subprocessors, retention, access model) and a
  SOC 2 readiness checklist (access logging, least privilege, vendor reviews,
  incident process). Not a code deliverable.

**Out of scope (now).** Actual SOC 2/ISO audit, HIPAA BAAs, in-transcript PII
redaction, data-residency regions.

**Data model.**
- `orgs` (or `bots`): `retention_days int null`.
- Optional `audit_log` table (`actor, action, target, at`) for access logging.

**Backend.**
- Retention cron: delete `messages`/`conversations` older than `retention_days`.
- `GET /api/account/export` (authed) → bundle org conversations + leads.
- `POST /api/account/delete` `{ scope: conversations|bot|all }` (authed, confirm).

**Frontend.**
- Settings page: retention control, export button, delete controls + confirmations.
- Public `/privacy` page; widget consent line (config flag + text).

**Acceptance criteria.**
- Set retention 30d → older conversations purged by the cron.
- Export produces a downloadable file scoped to the org.
- Deletion removes the targeted data; privacy page is live.

**Tasks.**
- [ ] Migration: `retention_days` (+ optional `audit_log`).
- [ ] Retention cron (Vercel Cron) + purge query.
- [ ] Export + delete endpoints (authed, RLS-scoped, confirmations).
- [ ] Settings UI (retention/export/delete) + `/privacy` page + widget consent.
- [ ] `docs/SECURITY.md` + SOC 2 readiness checklist.

---

## Cross-cutting notes

- **Migrations** live under `supabase/` and are applied with the Supabase CLI
  (`npx supabase db push`); every new table needs RLS mirroring the bot/org model.
- **Cron**: prefer Vercel Cron for retention, feed refresh, and conversation
  analysis; keep jobs idempotent.
- **Tests**: keep the live-gated pattern (`RUN_LIVE_*`) for anything hitting
  WooCommerce/Shopify/ElevenLabs; unit-test pure logic (normalizers, state
  machines, identity checks).
- **Secrets**: any new provider credential (WooCommerce REST, Shopify token) goes
  in `bots.config` server-side and must be excluded from `lib/widget-config.ts`.
