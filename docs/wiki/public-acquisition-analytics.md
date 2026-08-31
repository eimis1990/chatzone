# Public acquisition analytics

First-touch and conversion measurement for Loqara&apos;s own public website. This is
separate from merchant bot analytics.

## Route boundary

Only the homepage, blog, author/about, editorial/review methodology, privacy, and
terms routes enter public-site analytics. `PublicWebAnalytics` filters Vercel page
views/events, while `GoogleAnalytics` uses the same route predicate. Authenticated
app, owner, embed, presentation/demo, and login traffic is excluded
(`lib/acquisition.ts:42-57`, `components/analytics/PublicWebAnalytics.tsx:10-34`,
`components/analytics/GoogleAnalytics.tsx:29-52`).

## First touch

`captureFirstTouch` stores one privacy-bounded record for 90 days. It retains the
first landing pathname, a referrer stripped of query/hash, explicit UTM fields,
and a timestamp. It intentionally drops arbitrary query parameters, search terms,
and click IDs. Later campaigns cannot overwrite an unexpired first touch
(`lib/acquisition.ts:106-159`).

Search referrers are classified as `organic`, known answer-engine referrers as
`ai_referral`, other external hosts as `referral`, and an absent referrer as
`direct / none` (`lib/acquisition.ts:73-88`).

## Funnel and signup persistence

The public funnel is CTA click → dialog open → first form edit → submit → newly
recorded signup. Every event carries the same bounded acquisition properties to
both Vercel custom events and GA4 (`lib/analytics.ts:20-41`,
`components/landing/GetStartedDialog.tsx:115-229`). Bot-fast, honeypot, and
duplicate submissions do not count as a recorded signup.

Migration `20260826085019_signup_acquisition_attribution.sql` adds the attribution
columns to `signups`; `/api/signup` writes them only from the strict bounded schema
(`app/api/signup/route.ts:15-91`). The owner signup card and CSV expose the saved
dimensions (`app/(owner)/owner/signups/page.tsx:7-42`,
`components/owner/SignupsExport.tsx:5-69`).

The deploy/configuration checklist, GA4 Explore recipe, and controlled production
evidence live in `docs/seo-data/organic-funnel-report.md`. GA4 Realtime is the
immediate deployment check; the saved Explore is the durable report and can lag
while GA4 processes newly registered dimensions.

_Last verified: 2026-08-26 (migration and application commit `94a9e4b` live;
six GA4 dimensions and the organic funnel Explore configured; controlled
production journey verified through GA4 Realtime, database, owner card, and
CSV; labeled test signup deleted after explicit confirmation)._
