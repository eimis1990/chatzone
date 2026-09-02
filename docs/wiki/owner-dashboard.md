# Owner dashboard

Platform-wide overview for the owner role: `app/(owner)/owner/page.tsx`. It's an
async server component with direct Supabase queries (no API route/action), gated
by `requireRole('owner')`.

## Owner shell and sidebar

- The owner content surface meets the sidebar directly while retaining a full
  corner radius and the outer top, right, and bottom gutter. Expanded active
  and hover rows therefore reach the content edge without a permanent dark gap;
  only the rounded corner cutouts expose the shell
  (`app/(owner)/owner/layout.tsx:24-35`, `components/owner/OwnerSidebar.tsx:90-139`).
- The sidebar collapses from 256px to an 80px icon rail. It retains 44px square
  destinations, visible active/focus states, right-side labels, open-bug count,
  and compact report/sign-out actions. Width, header controls, wordmark, labels,
  and nested indentation transition together with reduced-motion fallbacks. Rail
  tooltips are remounted only after the transition settles so moving triggers
  cannot leave stale popups. When a nested owner section is active, its child
  destination backgrounds span the full expanded sidebar width, while their
  icon/label content is indented past an overlaid vertical hierarchy guide. They
  remain accessible in a dark grouped region when collapsed; the current child
  uses a 10% accent tint and full-accent icon/text rather than competing with
  the solid parent (`components/owner/OwnerSidebar.tsx:157-373`).
- The owner shell deliberately omits the decorative bottom grid used by the
  client portal (`app/(owner)/owner/layout.tsx:27-33`).

## Stat sources

The six stat cards and the earnings card load in one `Promise.all`
(`app/(owner)/owner/page.tsx:31`):

- **Clients / Active bots / Conversations / Messages / Leads** — the `owner_stats`
  view (`supabase/migrations/0003_rpc.sql:35`), `security_invoker`.
- **Leads** specifically is `count(*)` of `public.leads` (bot lead-captures). It is
  independent of Signups — different table, no trigger couples them.
- **Signups** — `count(*)` of `public.signups` (landing-page emails).
- **Live bots this week** — `bots` active + `last_seen_at` within 7 days.

⚠️ **Demo data counts toward totals.** The Aurora Living demo org (behind the
Features screenshots) is a real client row, so it inflates platform stats. Recent
activity filters out the *platform* org (`is_platform`) but not demo client orgs.
On 2026-07-11 the Leads card read 5 purely from seeded Aurora demo leads (identical
timestamps, fake names); they were deleted so real leads count from 0. If demo data
reappears in totals, that's the cause — not a code bug.

## Demo bot transfers

A demo bot becomes the client's real bot in one action: **Transfer** on the
Demos card (`TransferDemoDialog` → `transferDemoBot`,
`app/(owner)/owner/demos/actions.ts`). The bot ROW moves org — every child
table (product index, knowledge, sync status, synonyms, voice agent) hangs off
`bot_id`, so the prepared demo follows the `org_id` update and RLS grants the
client access immediately; the `public_key`/embed snippet keeps working.
Demo conversations/widget events/leads are purged by default (checkbox to
keep). Bot-limit enforced like creation (`entitlementsFor(plan).maxBots`);
the dialog warns when the demo uses voice but the target lacks the add-on.
A tombstone row (`demo_transfers`, migration `20260803090000`) keeps a
"Transferred to X" card on the Demos screen with a **View bot** link into
`/owner/clients/[orgId]/bots/[botId]/configure`. After transfer the bot counts
in owner stats automatically (it left the `is_demo` org).

## Client bot editor (done-for-you)

`/owner/clients/[orgId]/bots/[botId]/{configure,knowledge,components,embed,analytics}`
share `OwnerBotTabs` (`components/owner/OwnerBotTabs.tsx`) and the amber
"editing as owner" banner layout. **Analytics** reuses the client's per-bot
`AnalyticsSection` verbatim (aggregates only — no transcripts), loaded via the
service client with an `org_id === orgId` check. The tab is hidden when
`OwnerBotTabs` gets a `base` override (the demos editor has no analytics route;
demo bots only carry preview traffic). Decision 2026-09-02: no separate
owner-side analytics model or cross-client dashboard until several paying
clients exist; per-client cost/token spend belongs in billing, not here.

## Demo presentation sharing

`Present` remains an owner-authenticated preview at `/present/[botId]`. `Share`
on a demo card manages a separate public `/present/share/[token]` link:

- `createDemoPresentationShare` generates 32 random bytes, stores only the
  SHA-256 digest in `demo_presentation_shares`, expires it after exactly 24
  hours, and revokes any previous active link (`app/(owner)/owner/demos/actions.ts`).
- The owner can revoke the active link explicitly. Creating a replacement also
  revokes the prior link; the raw bearer token cannot be recovered after the
  dialog closes (`components/owner/DemoShareDialog.tsx`).
- Every public request checks the hash, `revoked_at`, and `expires_at`, then
  independently joins the bot's **current** organization with
  `organizations.is_demo = true`. Moving the bot to a client invalidates the
  link even if link cleanup fails (`app/present/share/[token]/page.tsx`).
- The share table has RLS enabled and explicitly revokes both browser roles;
  only `service_role` has table grants. Resolution happens server-side after
  the token checks; only the presentation's minimal bot fields reach the renderer
  (`supabase/migrations/20260803152521_demo_presentation_shares.sql`).
- The stage backdrop URL is `config.websiteUrl || config.commerce.storeUrl`,
  resolved by `presentSiteUrl` (`lib/demo/present-bot.ts`), which also holds the
  shared "must be a demo-org bot" lookups both present pages and the backdrop
  proxy use. `websiteUrl` is a top-level config field edited in the
  configurator's "Names and introduction" group — non-commerce demo bots (e.g.
  hospitality) have no `storeUrl`, which used to leave the stage on the dots.

### Backdrop proxy (`/api/present/site`)

Client sites almost always send `X-Frame-Options`, so the stage cannot iframe
them directly and used to fall back to a flat mShots screenshot — a single
viewport-sized `<img>` with nothing to scroll. The backdrop is now the live
page, re-served from our origin without the framing headers
(`app/api/present/site/route.ts`, rewriting in `lib/demo/present-proxy.ts`).

- **Not an open proxy.** The caller passes `?bot=` (owner session required) or
  `?token=`, never a URL; the target comes from the bot's own config, so only
  owner-configured pages are reachable. `path` must start with a single `/`
  (`//evil.com` would resolve to another origin) and stay on the base origin.
- **Framed with `sandbox="allow-scripts"` and never `allow-same-origin`.** The
  page runs on our origin, so this opaque-origin boundary is the only thing
  keeping a client site's scripts away from our cookies. Do not relax it.
- **In-frame links navigate via postMessage, never by the frame navigating
  itself.** A navigation initiated by the opaque-origin document is cross-site
  to the browser, so SameSite=Lax auth cookies are stripped, the `?bot=`
  owner-session check 404s, and the stage goes blank after the first click
  (verified in Chromium: parent-initiated src load = cookie sent, frame
  self-navigation = cookie missing). The injected handler posts
  `{__loqaraPresentNav: path}` to the app origin and
  `PresentBackdropFrame` (`components/demo/PresentBackdropFrame.tsx`) sets
  `iframe.src` — parent-initiated loads carry cookies like the first one. The
  listener authenticates the message by `event.source`, not `event.origin`
  (an opaque origin reports `'null'`).
- That boundary breaks two things, both fixed by injection, both verified
  against karakara.lt:
  - `document.cookie` and Web Storage throw `SecurityError` on an opaque
    origin. WooCommerce themes read them while initialising, the exception
    aborts their bootstrap, and the page renders as a broken half-header.
    A shim installs memory-backed stand-ins *before* the page's own scripts.
  - External `<use xlink:href="….svg#id">` must be same-origin as the document,
    which an opaque origin never is — all 207 of karakara's icons vanished.
    The route fetches up to 3 sprite files and inlines them so the refs become
    origin-free `#id` fragments.
- ⚠️ **Known gap:** `<script type="module">` is always CORS-fetched, and client
  sites don't send `Access-Control-Allow-Origin`, so a Vite-built theme's entry
  bundle cannot execute in the backdrop. Layout, CSS, images, and scrolling are
  unaffected; JS-driven nav/dropdowns/add-to-cart are inert. Fixing it means
  proxying assets under path-shaped URLs (so relative imports resolve) with
  `ACAO: *` — deliberately not done.
- A site our server cannot fetch at all (CDNs that block datacenter IPs, e.g.
  Hostinger's — see [gotchas](gotchas.md)) still falls back to the mShots
  screenshot, which the *visitor's* browser loads from wp.com. The probe in
  `DemoPresentationStage` must keep using the same UA as the route, or probe
  and proxy can disagree.
- The app's CSP is still report-only. If it is ever enforced, `base-uri 'self'`
  will break the injected `<base>` — scope any promotion per-route.

## Earnings / MRR card

`MrrCard` (`components/owner/MrrCard.tsx`) renders current monthly recurring
revenue + ARR + paying-client count + per-plan breakdown. Computed by
`computeMrr` (`lib/billing/mrr.ts`) purely from `organizations` billing columns
(`plan`, `subscription_status`, `billing_interval`, `voice_addon`) × the in-code
`PLANS`/`VOICE_ADDON` catalog — **no Stripe call**. Rules:

- Paying = `active` or `trialing` (`past_due` excluded — not reliably collecting).
- Annual subs normalized to monthly as `monthly * 10 / 12` (annual billed at 10×/yr).
- Platform org and free/enterprise-custom (monthly ≤ 0) contribute nothing.
- Test: `tests/unit/mrr.test.ts`.

⚠️ **No MRR history is stored** — this is a live snapshot only. A growth-over-time
chart needs a monthly `mrr_snapshots` table + cron (not built yet). Also, euro
amounts are code constants, so DB-derived MRR drifts if Stripe prices ever diverge
from `lib/plans-catalog.ts` (the declared source of truth).

_Last verified: 2026-08-03 (working tree)._
