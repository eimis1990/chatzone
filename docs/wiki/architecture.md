# Architecture overview

Loqara is an AI chat & voice agent for e-commerce stores: a grounded chat/voice
widget embedded on a customer's site, plus an owner console and a per-client
dashboard. This page is the map; follow the links for detail.

## Stack

- **Next.js (App Router)** — this fork has breaking changes vs. training data; read
  `node_modules/next/dist/docs/` before writing framework code (see `AGENTS.md`).
- **Supabase** — Postgres + RLS + Auth + Storage. Server access via a service
  client (`lib/supabase/service`) and an RLS-scoped server client
  (`lib/supabase/server`).
- **Vitest** for unit tests. **Vercel** for hosting (push to `main` auto-deploys).
- OpenAI/Anthropic for chat; ElevenLabs for [voice](voice.md).

## Route groups (`app/`)

- `(auth)/` — login, reset, invite-accept.
- `(client)/app/` — the client dashboard: bots, configure, knowledge, inbox,
  analytics, leads, settings, subscription, team.
- `(owner)/owner/` — platform-owner console: clients, per-client bot editor
  (Configure / Knowledge / Embed), prompts library, sales leads. See
  [access-model](access-model.md).
- `api/` — chat (`api/chat`), the widget endpoints (`api/widget/*`,
  `api/widget-config`), ingestion, Stripe webhooks, etc.
- `embed/[publicKey]/` — the iframe the widget mounts. `blog/` — file-based blog.

## Subsystems (each has a page)

- [Widget & embed](widget-and-embed.md) — how the widget loads, `publicBotConfig`
  gating, the origin allowlist (and its first-party gotcha), the embed snippet.
- [Bot config](bot-config.md) — `botConfigSchema`, `ConfigForm` (shared by client
  & owner), per-language content.
- [Plans & entitlements](plans-and-entitlements.md) — what each plan allows and
  where it's enforced.
- [Languages / i18n](languages-i18n.md) — supported-language registry, per-bot
  language selection, free-tier single language.
- [RAG & knowledge](rag-and-knowledge.md) — ingestion pipeline + hybrid retrieval.
- [Commerce](commerce.md) — store connectors + semantic product search.
- [Access model](access-model.md) — owner/client roles, invites, RLS invariants.
- [Blog & SEO](blog-and-seo.md) — the markdown blog, schema, AEO conventions.
- [Voice](voice.md) — ElevenLabs voice agent.

## Operational

- [Conventions](conventions.md) — testing, deploy, commits, house patterns.
- [Gotchas](gotchas.md) — the sharp edges. Read this one early.

_Last verified: 2026-07-08 (66f6bb8)._
