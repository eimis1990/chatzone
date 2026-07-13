# Wiki index

The catalog. Skim this first, then read the pages that touch your task. New page?
Add a line here. How the wiki works: [README.md](README.md).

## Start here

- [architecture](architecture.md) — the map: stack, route groups, subsystem links.
- [conventions](conventions.md) — testing, deploy, git, framework, house patterns.
- [gotchas](gotchas.md) — the sharp edges that have bitten us. Read early.

## Subsystems

- [widget-and-embed](widget-and-embed.md) — widget load paths, `publicBotConfig`
  gating, the origin allowlist + first-party bypass, embed snippet UI.
- [bot-config](bot-config.md) — `botConfigSchema`, the shared `ConfigForm`
  (client + owner), system prompts.
- [plans-and-entitlements](plans-and-entitlements.md) — per-plan limits and where
  each is enforced server-side.
- [languages-i18n](languages-i18n.md) — language registry, per-bot selection,
  free-tier single language, content de-anchored from English.
- [rag-and-knowledge](rag-and-knowledge.md) — ingestion pipeline + hybrid retrieval.
- [commerce](commerce.md) — store connectors + live product search.
- [access-model](access-model.md) — owner/client roles, invites, owner
  done-for-you, RLS/security invariants.
- [blog-and-seo](blog-and-seo.md) — markdown blog, FAQ schema, AEO conventions,
  image pipeline.
- [voice](voice.md) — ElevenLabs voice add-on.
- [sales-leads](sales-leads.md) — owner outreach pipeline, prepared-email copy,
  chatbot-aware positioning, and UI behavior.
- [linkedin-content](linkedin-content.md) — draggable owner content board,
  ordering persistence, editorial drafts, and branded post visuals.
- [owner-dashboard](owner-dashboard.md) — platform stat sources, the MRR/earnings
  card (`computeMrr`), and the demo-data-in-totals gotcha. Demo bots live in the
  `is_demo` "Loqara Demos" org (`/owner/demos`, presented at `/present/[botId]`)
  and are excluded from `owner_stats` since migration `20260713120000`.

## Related docs (not in the wiki — linked, not duplicated)

- `docs/DEPLOY.md`, `docs/SECURITY.md`, `docs/ROADMAP.md`
- `docs/CHANNELS_IMPLEMENTATION.md` — paid messaging-channel plan, starting with Messenger
- `docs/seo-content-loop.md` — weekly GSC content loop + article format
- `docs/loqara-vs-parnidia.md` — competitor comparison
- `docs/prompt-templates/` — bot system-prompt templates

## Log

Chronological record of changes/decisions/learnings: [log.md](log.md).
