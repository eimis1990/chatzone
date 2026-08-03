# Owner dashboard

Platform-wide overview for the owner role: `app/(owner)/owner/page.tsx`. It's an
async server component with direct Supabase queries (no API route/action), gated
by `requireRole('owner')`.

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
