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

_Last verified: 2026-07-11 (working tree)._
