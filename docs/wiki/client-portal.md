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

- `/app/analytics` is the cross-bot quick view; per-bot Analytics routes remain
  the detailed drill-down. The server page scopes conversations, leads, and
  widget events to the user's organization and selected date window
  (`app/(client)/app/analytics/page.tsx:123-208`).
- The page aggregates widget opens, conversations, leads, link clicks, and
  weighted after-hours counts before rendering. Zero-denominator rates are `0%`,
  and bots with no tracked activity get an explicit empty comparison state
  (`app/(client)/app/analytics/page.tsx:210-253`, `:337-343`).
- Visual order is summary KPI cards → grouped cross-bot activity chart →
  conversion snapshot → precise clickable table. The page title/subtitle and
  date-range control stay consistent with the other client screens
  (`app/(client)/app/analytics/page.tsx:263-317`, `:319-475`).
- The grouped Recharts view uses semantic theme colors, exact-value tooltips,
  a visible legend, and a text summary for assistive technology; the table is
  the exact-data fallback (`components/client/charts/OrgBotComparisonChart.tsx:22-112`).

Related: [access-model](access-model.md), [bot-config](bot-config.md).

_Last verified: 2026-08-03._
