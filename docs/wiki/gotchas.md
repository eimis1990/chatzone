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

**Verskis exception:** its first sync crawls product sitemap URLs with 16 concurrent
workers and directly embeds rich breadcrumb/attribute data, skipping the generic AI
recipient-tagging pass. Mobel's 1,951-page fetch live-tested at ~69s, leaving the rest
of the 300s budget for four embedding batches + DB writes. Do not make the page crawl
sequential or re-enable full-catalog AI enrichment without re-measuring the budget.

## Same-name bots across orgs are DIFFERENT bots

The owner deliberately keeps identical copies of client bots (same display
name, e.g. "Natali AI"/"HomeByNB") for pre-sale testing — a bot is identified
by `(id, org_id)`, never by name. Before ANY destructive, bulk, or analytical
operation on bots, resolve and show each bot's org
(`organizations.name` + `is_platform`). On 2026-07-12 a same-name bot in the
HOME BY NB client org was nearly written off as a "duplicate" of one in the
3IMIS org. Existing protections: `lib/actions/deleteBot.ts` is scoped to the
caller's own org (the owner cannot delete client bots), `DeleteBotButton`
renders only in the client app, and the owner bot editor banner names the
client org. Client bots must NEVER be deleted by tooling.

## Provider fixes must not leak into shared commerce

Never put a store/provider-specific ranking rule, localized prompt hint,
hydrator, or index guard directly in shared `searchCatalog` / `match_products`.
Register it under `lib/products/provider-profiles/`; use a provider-named RPC
when database ranking differs. Never branch on a client's hostname. See
[commerce-provider-profiles](commerce-provider-profiles.md).

## Verskis product attributes are fields, not one bag of words

For furniture search, `Spalva: Balta` (main product/upholstery color) is not the
same constraint as `Kojų spalva: Balta` (white legs). Likewise Lithuanian
inflections (`baltos`, `kėdžių`) do not stem under Postgres's `simple` FTS
dictionary. `match_products_verskis` therefore ranks type prefixes in the title and the
main `Spalva`/`Color` value separately before general attribute/document matches
(`20260717115738_product_color_field_ranking.sql`). Do not collapse structured
attribute labels back into one text score; that recreates false colors.

## Indexed candidates are not the same as live product cards

A semantic RPC may return 20 rows while live hydration returns fewer: pages can be stale,
temporarily fail, be unparseable, or omit a machine-readable price. Verskis must overfetch before
hydration, preserve rank with bounded workers, retry once, and trim only after live stock/price
validation (`lib/products/search.ts:86-122`, `lib/commerce/verskis.ts:291-340`). Configurable Verskis
pages may omit JSON-LD `offers.price`; use the visible main price fallback, not a related-product
price (`lib/commerce/verskis.ts:207-217`). Also, the widget intentionally previews four carousel
cards: inspect the “See all (N)” count before diagnosing an N-result search as only four results.

## Anti-bot interstitials index as "knowledge"

Cloudflare challenge pages return HTTP 200 with clean-looking text, so Jina
Reader (datacenter IPs — gets challenged even when the owner's machine passes)
hands the pipeline "Performing security verification… Ray ID: …" and it lands
in `document_chunks` as a Ready source (all 18 dropslietuva.com pages, 2026-07-13).
`looksLikeBotChallenge` (lib/ingestion/parse.ts) now rejects challenge output —
two-signal heuristic (Cloudflare stamp AND challenge phrase) so real pages that
merely mention Cloudflare don't trip it. Jina-challenged → fall back to direct
fetch; direct also challenged → the source errors with a clear message instead
of indexing garbage. When auditing old bots, grep chunks for "Performing
security verification".

## Grouped `::before, ::after` selectors drop the shared block (Lightning CSS)

A single rule `.x::before, .x::after { ... }` in `app/globals.css` applies the
declaration block to `::before` ONLY — `::after` silently ends up with
`content: none` (Tailwind v4's Lightning CSS drops it). Symptom: one pseudo-glow
renders, the mirror doesn't. Fix: write two standalone rules, one per pseudo.
Verified via `getComputedStyle(el, '::after').content` returning `"none"`. See
the `.section-header-gradient` two-sided header glow in globals.css.
