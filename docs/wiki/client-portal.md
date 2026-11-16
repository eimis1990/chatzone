# Client portal

## Shell and sidebar

- The authenticated client layout resolves the first accessible organization,
  fetches its name alongside the bot list, and passes both into the desktop
  sidebar (`app/(client)/app/layout.tsx:19-38`, `:71-76`).
- The desktop brand lockup is Loqara plus the uppercase organization name. The
  company label is split into flexed characters and scales down for long names
  while staying within the fixed title width (`components/client/AppSidebar.tsx:124-129`,
  `:165-195`).
- Top-level sidebar items intentionally use taller vertical padding with no
  radius or horizontal nav gutter, so active and hover backgrounds span the
  full sidebar width. The desktop content surface has no left margin but keeps
  its full corner radius, making those states meet it directly except at the
  rounded corner cutouts; the outer top, right, and bottom gutter remains.
  Nested bot rows keep their hierarchy/indentation
  (`components/client/AppSidebar.tsx:63-77`, `:229-361`,
  `app/(client)/app/layout.tsx:60-82`).
- The desktop sidebar can collapse from 288px to an 80px icon rail. The rail
  keeps the Loqara mark, 44px square navigation targets, visible active/focus
  states, right-side tooltips, and compact bug-report/sign-out actions. Width,
  header controls, organization wordmark, labels, icons, and grouping transition
  together with reduced-motion fallbacks; rail tooltips mount only after the
  movement settles. When a bot route is active its nine screen icons remain
  directly available inside a dark group, with the current screen using the
  accent icon/text beneath the solid My Bots parent but no selection fill. Choosing
  My Bots expands the sidebar so bot switching is never hidden. In the expanded
  hierarchy, first-level bot rows span the full sidebar width, while the active
  second-level destination uses accent text/icon only (no selected background).
  The mobile top and bottom bars are unaffected. Every row and nested group is non-shrinking;
  when the list exceeds the available height, the navigation region scrolls
  instead of compressing square buttons into pills or overlapping labels
  (`components/client/AppSidebar.tsx:52-107`, `:151-524`).
- The client shell no longer mounts the decorative bottom grid
  (`app/(client)/app/layout.tsx:63-82`).

## Organization analytics

- The standalone `/app/analytics` screen is RETIRED (commit `e71f1a8`); the
  cross-bot rollup now renders inline on Home (`app/(client)/app/page.tsx`,
  `rollup` block) using `getOrgAnalyticsRollup`
  (`lib/analytics/org-rollup.ts`) — one row per bot, totals, chat-start /
  lead-capture / product-click / after-hours rates, 30-day window. Home tiles:
  Widget opens · Conversations · Suggestions · Product clicks (leads and
  link clicks live in the conversion snapshot below). Suggested products come
  from `messages.products` via a `conversations!inner(bot_id)` embedded filter. Per-bot Analytics routes
  (`components/bot-views/AnalyticsSection.tsx`) remain the detailed drill-down
  and are shared with the owner portal (owner's own bot + client bots).
- Zero-denominator rates are `0%`; bots with no tracked activity get an explicit
  empty comparison state.
- The grouped Recharts view uses semantic theme colors, exact-value tooltips,
  a visible legend, and a text summary for assistive technology
  (`components/client/charts/OrgBotComparisonChart.tsx`).

## Settings workspace

- `/app/settings` is divided into Notifications, Data & privacy, and Security
  tabs instead of one long stack. The tab bar uses a shared animated underline,
  reduced-motion-safe panel transitions, and the same full content width for
  every panel. Notification switches auto-save with visible saving/saved
  feedback and roll back on failure; retention, export, policy, and destructive
  data controls stay together in the data tab
  (`app/(client)/app/settings/page.tsx:92-116`,
  `components/client/SettingsPanel.tsx:207-466`,
  `components/ui/tabs.tsx:82-95`).
- Conversation and lead deletion use a destructive confirmation dialog and
  surface server-side failures instead of reporting unconditional success
  (`app/(client)/app/settings/page.tsx:72-90`,
  `components/client/SettingsPanel.tsx:434-474`).
- The password form lives in the Security tab, keeps current-password
  verification, and exposes field-level validation and pending feedback
  (`components/client/ChangePasswordCard.tsx:26-150`).

Related: [access-model](access-model.md), [bot-config](bot-config.md).

_Last verified: 2026-08-28._

## Conversation history pagination (2026-11-16)

- The shared client/owner conversations view uses `?page=N` with 50 rows/page,
  stable `last_message_at, id` ordering, and embedded `messages(count)` plus
  filtered negative-feedback counts (`lib/conversations.ts:18`). These remain
  RLS reads. Older history beyond Supabase's default 1,000-row response limit
  is reachable; stale out-of-range page links resolve to the final page.
- HomeByNB's 1,007 conversations reproduced HTTP 400s from the former 1,000-ID
  message filters and 855-visitor block filter. The latter threw during Server
  Component rendering. Pagination bounds block lookups, and embedded counts
  avoid downloading/truncating raw message rows.
- Failed history reads show an explicit retry state. Failed supplementary
  block lookups show a warning while keeping transcripts usable
  (`components/bot-views/ConversationsSection.tsx:45`). First/last page database
  queries verified against HOME BY NB's bot on 2026-11-16 (50/7 rows, blocks 200).

## Analytics and subscription policy (2026-11-16)

Free now receives basic usage/activity totals; legacy Free keeps the full view
until its announced deadline. Basic and above receive the existing full
analytics/CSAT reports. These gates run before detailed queries, on both Home
and the shared analytics view (`components/bot-views/AnalyticsSection.tsx:77`).
Subscription shows five plan cards, actual effective allowance, payment-month
top-up expiry, and downgrade consequences. See [entitlements](plans-and-entitlements.md)
and [usage sessions](conversation-usage.md).
