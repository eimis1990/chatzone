# Client portal

## Shell and sidebar

- The authenticated client layout resolves the first accessible organization,
  fetches its name alongside the bot list, and passes both into the desktop
  sidebar (`app/(client)/app/layout.tsx:19-38`, `:71-76`).
- The desktop brand lockup is Loqara plus the uppercase organization name. The
  company label is split into flexed characters and scales down for long names
  while staying within the fixed title width (`components/client/AppSidebar.tsx:48-65`,
  `:91-105`).
- Top-level sidebar items intentionally use taller vertical padding with no
  radius or horizontal nav gutter, so active and hover backgrounds span the
  full sidebar width. The desktop content surface has no left margin or left
  radius, making those states meet it directly; the outer top, right, and bottom
  gutter remains. Nested bot rows keep their hierarchy/indentation
  (`components/client/AppSidebar.tsx:67-76`, `:112-146`, `:164-198`,
  `app/(client)/app/layout.tsx:61-82`).

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

_Last verified: 2026-08-03 (89ac480)._
