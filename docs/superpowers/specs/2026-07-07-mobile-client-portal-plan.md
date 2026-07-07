# Mobile client portal — implementation plan

Companion to `2026-07-07-mobile-client-portal-design.md`. Front-end only.
Breakpoint: `md` (768px) — mobile shell below, desktop sidebar at/above.

## Phase 0 — Prerequisite: auth reflows
- Verify `app/(auth)/login`, `reset-password`, `accept-invite/[token]` are
  usable on a 380px viewport. Fix only if broken.
- Check: load each at mobile width in the preview; no horizontal scroll, tap
  targets reachable.

## Phase 1 — Responsive shell (kills "terrible")
- `components/client/MobileTabBar.tsx` (client): fixed bottom bar, 4 tabs
  (Home `/app`, Inbox `/app/inbox`, Leads `/app/leads`, More `/app/more`),
  icon + label, active state via `usePathname`, iOS safe-area inset, `md:hidden`.
- `components/client/MobileTopBar.tsx` (client): logo + account/sign-out sheet,
  `md:hidden`.
- `app/(client)/app/layout.tsx`: keep `AppSidebar` (`hidden md:flex`), add
  `MobileTopBar` + `MobileTabBar`; give `<main>` bottom padding
  (`pb-20 md:pb-0`) so the tab bar never covers content; drop the desktop `m-3`
  card framing on mobile.
- Pass the existing `bots` + handoff `inboxCount` (already computed in layout)
  into the tab bar for the Inbox badge.
- Check: every existing screen is scrollable and reachable on mobile; tab bar
  fixed and thumb-reachable.

## Phase 2 — Home + Analytics on mobile
- `app/(client)/app/page.tsx`: bot grid already `sm:grid-cols-2 xl:grid-cols-3`
  → confirm single-column < sm; ensure cards + free-tier banner reflow.
- Zero-bots on mobile: replace the desktop onboarding hero with a compact
  "Create your first bot on a computer" card (bot creation stays desktop-only).
- Per-bot Analytics (`components/bot-views/AnalyticsSection.tsx`): stat grid is
  already responsive (`grid-cols-2 md:grid-cols-3 xl:grid-cols-4`); verify
  charts go full-width and the hour histogram/labels don't overflow < 380px.
- Bot card tap target on mobile → `/app/bots/[id]/analytics` (design decision).

## Phase 3 — More + Conversations (read-only)
- `app/(client)/app/more/page.tsx`: menu → Conversations, Analytics (bot
  picker), account, and the "manage everything else on desktop" card.
- Conversations mobile: reuse existing per-bot conversations data; a mobile
  list → tap → read-only history view. Add a bot filter when org has >1 bot.
  (Confirm whether an org-level conversations route exists; if not, add
  `/app/conversations` reading across org bots — mirrors org analytics pattern.)

## Phase 4 — Unified Inbox + Leads (the operate loop)
- `app/(client)/app/inbox/page.tsx`: cross-bot list of conversations in
  `requested`/`live` handoff, newest first; tap → conversation history +
  reply composer. **Reuse the exact desktop handoff reply path** (the
  `from_human` message insert + polling) — do not fork it.
- `app/(client)/app/leads/page.tsx`: cross-bot leads, newest first; each row
  `tel:`/`mailto:` quick actions.
- Both follow the org-analytics cross-bot aggregation (query all `org_id`
  bots, filter in memory). These are the only genuinely new routes.
- Risk fallback: if unification balloons, point the tabs at existing per-bot
  screens with a bot switcher and defer true cross-bot merge.

## Verification per phase
- `npm run typecheck` + `npm run build` green.
- Manual: preview at 375px (mobile) and ≥768px (desktop unchanged).
- Ship phase-by-phase to `main` (auto-deploys); each phase is independently
  useful, Phase 1 alone removes the broken state.
