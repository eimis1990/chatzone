# Gotchas

Sharp edges that have bitten us. Read before debugging something weird.

## Fixed-height rows still shrink inside a flex-column scroller

`overflow-y-auto` does not by itself force a vertical flex container's children
to retain their height. With enough client sidebar destinations, `h-10`/`size-11`
rows compressed instead of overflowing: square rail buttons became pills and
expanded labels overlapped. Navigation rows, bot wrappers, and nested groups
must use `shrink-0`, and the flexing scroll region needs `min-h-0`
(`components/client/AppSidebar.tsx:52-107`, `:286-502`).

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

## Edge prompt imports must not cross into server provider registries

`/api/llm/[publicKey]` is intentionally Edge-hosted for low-latency voice SSE.
It imports `lib/ai/prompt.ts`, so even a pure-looking helper imported from an
aggregate server module can pull every transitive dependency into the Edge
bundle. The first provider-profile implementation made this chain:
`Edge route → prompt → provider-profiles/index → Verskis → catalog → node:crypto`,
which compiled but failed while Vercel collected page data. Import prompt-only
metadata from `lib/products/provider-profiles/guidance.ts` and pure capability
checks from `lib/commerce/capabilities.ts`; never import the aggregate profile
or commerce dispatcher from Edge prompt code. Run `npm run build`, not only
TypeScript/unit tests—the production bundler is what evaluates runtime
compatibility. Next's Edge runtime supports Web Crypto, not native `node:*`
modules.

## ElevenLabs client-tool inputs must stay scalar

The ElevenLabs tool-create endpoint rejected `display_products` when
`productIds` used an array/items schema. A failed tool sync happens inside the
voice-token request, so the browser only sees the route's generic 502. Encode
multi-value inputs as a JSON string (`productIdsJson`) and parse them in the
browser; validate every decoded id against the latest search candidates before
rendering (`lib/ai/elevenlabs-agent.ts:318-343`,
`lib/ai/voice-product-search.ts:30-80`). Preserve the upstream response body in
server logs (`lib/ai/elevenlabs-agent.ts:408-431`) so future schema rejections
are diagnosable without exposing them to visitors.

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

## A curl 403 does not mean the site blocks our ingestion

Hostinger's CDN (`server: hcdn`) 403s curl's TLS fingerprint even with a full
Chrome User-Agent — homepage, robots.txt, sitemaps, everything. The same URLs
return 200 to Node's `fetch` (what `discoverPages`/`parseUrl` actually use) and
to Jina Reader (taujenudvaras.lt, 2026-08-12). When qualifying a prospect or
debugging a crawl, test with `node -e 'fetch(...)'` or the real pipeline, not
curl. The reverse trap also exists — see "Anti-bot interstitials" above.

## Grouped `::before, ::after` selectors drop the shared block (Lightning CSS)

A single rule `.x::before, .x::after { ... }` in `app/globals.css` applies the
declaration block to `::before` ONLY — `::after` silently ends up with
`content: none` (Tailwind v4's Lightning CSS drops it). Symptom: one pseudo-glow
renders, the mirror doesn't. Fix: write two standalone rules, one per pseudo.
Verified via `getComputedStyle(el, '::after').content` returning `"none"`. See
git history for the former `.section-header-gradient` two-sided header glow;
that visual treatment was removed on 2026-08-03, but the compiler behavior is
still relevant to future pseudo-element styles.

## Browser-only preferences must not change the first hydrated tree

`useReducedMotion()` cannot know the browser preference during server rendering.
Branching directly on it made `HeroVideo` render video on the server and a poster
on the first reduced-motion client render, causing a full hydration mismatch.
Keep the server and first client snapshot identical. `HeroVideo` now reads a
stable server snapshot through `useSyncExternalStore`, subscribes to viewport,
motion, and connection changes with cleanup, and enables video only after the
browser snapshot is available (`components/landing/HeroVideo.tsx:38-98`). The
pure policy also keeps Save-Data and 2G clients poster-only
(`lib/hero-media.ts:38-56`).

The same rule applies to decorative subtrees: `Shimmer` previously returned
`null` from a first-client reduced-motion branch and caused a separate CTA
hydration mismatch. Render the same nodes and disable animation with a CSS media
query (`components/landing/Shimmer.tsx:1-15`). Apply this pattern to color scheme,
viewport, storage, and any browser-only state that changes element structure.

## Absolutely positioned media wrappers need an explicit width

Do not rely on `aspect-ratio` to infer the width of an absolutely positioned,
non-replaced wrapper whose children are also absolutely positioned. Some browser
layouts resolve that shrink-to-fit width to zero, hiding both the hero poster and
video. The fox media wrapper spans the stage explicitly; `object-contain` and
`object-position` size and optically center the actual media inside it
(`app/globals.css:353`, `components/landing/HeroFoxMedia.tsx:63`).

## Deferred third-party launchers must replay the first interaction

Simply delaying `widget.js` removes the real launcher, so an early visitor click
either has no target or only starts loading and then requires a second click.
`WidgetEmbed` renders a lightweight proxy for deferred policies, records whether
that click should open chat, and clicks the real launcher after the loader fires
(`components/landing/WidgetEmbed.tsx:43-74`, `104-113`). Keep the default policy
immediate for owner presentations, cancel both delay and idle callbacks on unmount,
and remove body-level widget nodes because they live outside React
(`components/landing/WidgetEmbed.tsx:79-98`).

_Last verified: 2026-07-21 (6b3b5e6)._

## `pkill -f "next start"` doesn't kill the server

`next start` re-titles its process to `next-server (vX.Y.Z)`, so pkill by the
start command leaves an orphaned server running — it keeps serving the OLD
build from memory, and after a rebuild the stale HTML references chunk hashes
that 500. Symptoms: edits "not appearing", phantom stale pages, corrupted-
looking chunk maps. Kill with `pkill -f next-server`, then rebuild/restart.
(Discovered 2026-07-21 while verifying landing changes.)

## `useReducedMotion()` in render output hydrates a mismatch

framer-motion's `useReducedMotion()` resolves to `false` during SSR and to the
real preference on the client, so ANY render branch on it — `{!reduce && <X/>}`,
`style={reduce ? undefined : {...}}` — makes the client's first tree differ from
the server HTML and throws "Hydration failed" on a reduce-preferring machine.
Use `useReduce()` (`components/landing/use-reduce.ts`), a `useSyncExternalStore`
matchMedia read with a `false` server snapshot: React re-renders after hydration
instead of warning. Same class of bug as the color-scheme case above.
(Discovered 2026-07-25 building the landing candidates.)

## Vitest hooks call a returned function as teardown

`beforeEach(() => mock.mockReset())` looks harmless, but `mockReset()` returns
the mock itself and vitest invokes a hook's returned *function* as the test's
teardown — so the mock gets a phantom extra call after every test. If its
implementation at that moment returns a rejected promise (`mockRejectedValue`),
the teardown rejection fails the test with the mock's error and a stack that
points at the `new Error(...)` line, nowhere near the real cause. Always brace
hook bodies: `beforeEach(() => { mock.mockReset() })`.
(Discovered 2026-07-27 testing `lib/ai/abuse-intel.ts`.)

## A serial full-fleet cron silently starves the tail

`/api/cron/catalog-sync` re-syncs every indexed bot's catalog in ONE serverless
invocation (`maxDuration: 300`). The platform kill at 300s produces no error and
no log — each night the same first ~2 bots synced (one big WooCommerce store
alone takes ~3 min) and every bot after them just… never ran. Karakara.lt's
product index sat 16 days stale while the cron "ran successfully" nightly; the
symptom surfaced as the bot denying a product that was visibly in the store.
The per-bot `try/catch` cannot catch a platform kill, and `synced_at` only
moves on a COMPLETED sync — so `max(synced_at)` per bot is the honest health
signal (`… 04:02`, `… 04:05`, then two-week-old stamps = killed at 04:05).
Fix: stalest-first ordering + don't start a new bot after 240s elapsed
(`START_BUDGET_MS`), so skipped bots are first in line the next night.
(Discovered 2026-08-14 debugging "skalbimo lapeliai" missing on the karakara
demo bot the morning of the demo.)

## MetaMask extension failures can masquerade as Next.js runtime errors

Chrome extensions execute code in the page context, so MetaMask can emit an
unhandled `Failed to connect to MetaMask` rejection whose stack begins at
`chrome-extension://nkbihfbeogaeaoehlefnkodbefgpgknn/...`. Next 16's dev
overlay sees that rejection even though Loqara has no wallet integration and
labels it as an app runtime issue. The root layout's explicit `<head>` installs a
development-only `beforeInteractive` capture listener before Next's client modules. It suppresses
only the exact MetaMask message when the stack or filename also contains the
official extension id; ordinary application errors and other extension errors
still reach the overlay (`lib/browser-extension-errors.ts:1-38`;
`app/layout.tsx:290-299`). A `beforeInteractive` `<Script>` cannot be a direct
child of `<html>` in Next 16.2.9 even though the component docs say it will be
injected into `<head>` regardless of placement; React reports an invalid nested
script and an ordering error. Do not replace this with a broad global error
filter.

_Last verified: 2026-08-17 (MetaMask dev-overlay guard)._

## `DialogContent` carries a responsive `sm:max-w-sm` default

The shared dialog popup includes both `max-w-[calc(100%-2rem)]` and
`sm:max-w-sm`. Adding only an unprefixed `max-w-none` does not override the
responsive rule at desktop widths. The sales-email preview therefore stayed a
384px-wide panel even after receiving `w-screen`; combined with `inset-0`, it
looked like another left drawer. Override the matching breakpoint explicitly
(`sm:max-w-none`) and keep the shared centered `top-1/2`, `left-1/2`, and
translate utilities when building a large centered dialog
(`components/ui/dialog.tsx:46-49`;
`components/owner/LeadEmailTemplates.tsx:190-194`).

## Tailwind v4 compiles scale/rotate as standalone properties

`scale-110` and `rotate-6` emit the CSS `scale:`/`rotate:` properties, not a
composed `transform:`. They still animate under `transition-transform`, whose
v4 property list is `transform, translate, scale, rotate` — so do NOT "fix" a
hover animation by switching to `transition-all`. To randomize a value CSS
can't (e.g. the add-on illustration's tilt direction per hover), set a CSS var
in an event handler and read it with an arbitrary value:
`rotate-[var(--addon-tilt,6deg)]` (`components/client/BillingPanel.tsx:145-160`).
Calling `Math.random()` in a handler is fine; the `react-hooks/purity` lint
rule only rejects it during render.

To confirm an arbitrary/dynamic class actually compiled (a dropped class ships
a silent no-op), build the stylesheet and grep it — dev-server CSS chunks won't
contain classes from routes that never rendered:
`npx @tailwindcss/cli -i app/globals.css -o /tmp/check.css` (short flags only;
npm mangles `--input`/`--output`).

_Last verified: 2026-08-21 (add-on hover tilt)._

## Email deliverability: Microsoft 365 recipients silently quarantine new senders

Invite emails to a client on M365 (MX `*.mail.protection.outlook.com`) were
accepted by our provider but never reached the inbox — Exchange Online
Protection quarantines first-contact mail from low-reputation domains without
putting anything in the Junk folder. All email now goes out through the real
`hello@loqara.com` Hostinger mailbox (`lib/email.ts`), which has normal mailbox
reputation. If a client still reports a missing invite: verify the mailbox
exists (SMTP RCPT check), then have them search Microsoft quarantine — and just
copy the invite link from `/owner/clients/[orgId]` and send it by another
channel. `emailEnabled()` keys on `HOSTINGER_EMAIL_PASSWORD`.

## Vercel functions and the database must share a region

Until 2026-09-02 production functions ran in `iad1` (default) while the
Supabase project is `eu-central-1`: the `x-vercel-id` header read
`fra1::iad1::…`. Every PostgREST round trip crossed the Atlantic, and a chat
turn makes ~5 sequential ones before the model is called. `vercel.json`
`"regions": ["fra1"]` pins the project; Next's `preferredRegion` segment
option is ignored for the Node runtime on Vercel, so don't reach for it.
Check with `curl -sI https://www.loqara.com/api/... | grep x-vercel-id`.

## A smaller model is not a faster first token

Measured 2026-09-02 on the same ~2k-token prompt, 3 runs each: gpt-4.1 reached
the first token in 0.56–0.90s; gpt-4.1-mini 0.93–1.39s; gpt-4.1-nano
0.97–1.98s; gpt-4o-mini 0.58–1.88s. The chat fast lane therefore keeps the
bot's model and only drops tools + the commerce prompt. Re-measure before
proposing a model swap for latency (script pattern: `streamText` + `textStream`
timing, see `lib/ai/fast-lane.ts` header).

## A CTE over vector rows that is read twice gets materialized — and spills

`match_products` selected a bot's rows (with their 6KB embeddings) into a
`base` CTE used by four branches. Postgres materializes a CTE referenced more
than once; 2.5k rows x 6KB overflow `work_mem`, so every call wrote ~40MB of
temp files and re-read them four times (EXPLAIN: `temp written=1332`), and the
FTS branch recomputed `to_tsvector` per row instead of using the GIN index.
660ms warm, 4.3s cold. Write `with base as not materialized (` so each branch
uses its own index — but then the vector branch picks HNSW, which with a
`bot_id` post-filter returned 7 of 30 rows; order by `1 - (embedding <=> q)
desc` to force the exact per-bot scan (~25ms at 2.5k rows). A function-level
`set hnsw.iterative_scan` is refused for our role. Check any new matcher with
`supabase db query --linked -f explain.sql` before shipping it.

## The live function body may not match the migration files

`pg_get_functiondef('public.match_products(uuid, vector, text, int, text,
float)'::regprocedure)` showed the field-aware Verskis body (`loose_prefix`,
`field_raw`) live on the SHARED matcher on 2026-09-02, although migration
`20260717162814` defines the provider-neutral hybrid/title body and
`supabase migration list` says everything is applied. Symptom on Woo bots:
3-letter-prefix noise ("pledas" → acne patches, "kuponas" → backpacks). When
ranking looks wrong, fingerprint the live definition before reading SQL files.
Fixed by migration `20260902210000` (applied 2026-09-02, also the perf fix above).

## `create or replace view` can only APPEND columns

Postgres refuses to rename/reorder existing view columns in place
(`cannot change name of view column "x" to "y"`, SQLSTATE 42P16). When
extending a view like `org_stats`, add the new columns **after** the last
existing one, or `drop view` + recreate (which also drops dependent grants).
Bit us on `20260903080000_org_stats_product_counts.sql`.

