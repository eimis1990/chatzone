# Gotchas

Sharp edges that have bitten us. Read before debugging something weird.

## `npm run lint` has ~51 warnings by design

The React Compiler lint rules (`eslint-plugin-react-hooks` v6, shipped by this
Next version) are downgraded from error → **warn** in `eslint.config.mjs`:
`purity`, `set-state-in-effect`, `static-components`, `preserve-manual-memoization`,
`refs`. The codebase predates them and uses intentional patterns they flag (e.g.
`setState` in an effect for SSR/first-render agreement in `ChatWindow`/`EmbedShell`).
So **0 errors is the passing bar; warnings are expected**. `rules-of-hooks` and
`exhaustive-deps` remain errors. Adopting the compiler properly (and re-erroring
these) is a deferred, per-component migration that needs browser verification —
don't bulk-"fix" them blind.

## Widget shows "This chatbot is currently unavailable"

The embed iframe (served by our app) fetches `/api/widget-config` **same-origin**,
so a same-origin GET carries **no `Origin` header**. If a bot has a non-empty
`allowedDomains`, `isOriginAllowed` used to reject the missing origin → 403 →
that message. Fixed in `lib/widget-auth.ts`: **first-party requests (no Origin,
or the app's own host) bypass the allowlist**; the allowlist only governs
third-party parent sites (which always send a cross-origin Origin). Onboarding
now auto-adds the client's domain to `allowedDomains`, which is what first
exposed this. See [widget-and-embed](widget-and-embed.md).

## `npx vitest` fails with ERR_REQUIRE_ESM

Use `npm test` — it sets the required `--experimental-require-module` flag. See
[conventions](conventions.md).

## Markdown inside raw HTML blocks doesn't render

`marked` treats a block-level HTML element as a raw HTML block and does **not**
parse markdown inside it. Use `<strong>`/`<em>`, not `**`/`_`, inside
`<blockquote>`/`<div>` in blog posts.

## `content.en` is no longer guaranteed

Bot config `content` is now a fully-optional per-language record (a bot can be
Lithuanian-only). Never assume `config.content.en` exists — use optional access
and fall back (`content[lang] ?? content.en ?? Object.values(content)[0]`). See
[languages-i18n](languages-i18n.md).

## Plan limits must be enforced server-side

`allowedDomains`, `maxLanguages`, `maxBots`, etc. — the ConfigForm UI gates are
convenience only. The authoritative enforcement is in `publicBotConfig`
(`lib/widget-config.ts`) for the widget and `createBotInOrg` for bot creation. A
downgraded client can still hold stale over-limit config; the serve-time clamp is
what protects the product.

## Magento public APIs

crocs.lt and open24.lt block public Magento APIs — test Magento connectors
against `venia.magento.com`. See [commerce](commerce.md).

## Concurrent sessions on this checkout

More than one agent session sometimes commits to this working copy. If history
looks scrambled, check `git log`/reflog before assuming your work was lost.

_Last verified: 2026-07-08 (66f6bb8)._

## Catalog sync vs. the serverless time budget

A full sync (fetch → AI-enrich → embed → index) of a ~2,600-product store can
exceed the 300 s `maxDuration` on Vercel → the client sees a 504 "Network
error". Two protections exist: `fetchWooCatalog` retries a failed page once,
and the index refresh is **upsert-then-prune** (`lib/products/sync.ts`) so a
killed run leaves the old index intact — it used to be delete-then-insert, and
one 504 left a bot searching 400 of 2,582 products. A run that dies during
ENRICHMENT writes nothing (no partial progress), so a FIRST sync of a very
large catalog may not complete on Vercel — run it from localhost (same DB) as
the workaround. Note: Next 16 enforces `maxDuration` in dev too, and localhost
runs can exceed a curl/undici client's 5-min header timeout while the handler
keeps running — fire-and-forget + poll `catalog_sync_status` instead. RE-syncs
are incremental since migration `20260712190000`: `productRawHash` (raw inputs,
rank folded to the top-seller bucket) is stored per row and unchanged products
skip enrichment + embedding entirely — a 1,480-product re-sync measured ~59 s
vs ~5 min, so the button and the nightly cron fit the budget once a store is
indexed. Also: the config UI's progress poll must ignore a stale terminal
status row ('done'/'error' from a previous run) until it has seen a live phase,
or retries show no progress (`ConfigForm.tsx` `sawLive`).
