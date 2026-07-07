# Mobile client portal — design

**Date:** 2026-07-07
**Status:** Approved in brainstorm, pending spec review
**Scope:** Front-end only. No backend/API/schema changes.

## Problem

The client portal (`app/(client)/app/*`) renders a fixed 288px desktop sidebar
(`AppSidebar`) with no mobile layout. On a phone the sidebar covers the screen
and the content panel is pushed off-canvas — effectively unusable. Clients
already receive emails (signup, usage-80%, **handoff requested**, **lead
captured** — all live in `lib/notify.ts`) that link into the portal, so they
are *already* landing here on their phones and hitting a broken UI.

## Principle

Mobile is a different **job** from desktop, not a smaller screen:

- **Desktop = build & configure** (bots, knowledge, embed, theming, team,
  billing). Deliberate, wide-screen, keyboard work. Stays desktop-only.
- **Mobile = monitor & respond** (check in, take over a live chat, follow up a
  lead, glance at numbers). This is what we build.

Mobile is a focused monitoring/response app, **not** a shrunk portal. The whole
effort is front-end because the notification layer already exists.

## Navigation — bottom tab bar

Below the `md` breakpoint (< 768px) the desktop sidebar is hidden and replaced
by a fixed **bottom tab bar** (thumb-reachable, app-like), plus a minimal top
bar (logo + account/sign-out). At `md`+ the current desktop sidebar is
unchanged.

Four tabs:

| Tab | Contents |
|-----|----------|
| **Home** | Bot cards, each with headline numbers (conversations, leads, after-hours %). At-a-glance "is it working". |
| **Inbox** | Handoff takeover — conversations in `requested`/`live` state, **unified across all the org's bots**. The interactive star: tap → conversation view with a reply box. |
| **Leads** | Captured leads, **unified across bots**, newest first. Tap-to-call and tap-to-email. |
| **More** | Conversations (read-only list → detail) and per-bot Analytics, plus a "manage everything else on desktop" card. Account/sign-out. |

Safe-area inset handled for iOS home indicator.

## Screens (5 to design)

1. **Home** — bot list as cards with per-bot headline numbers.
   - Tapping a bot → **that bot's Analytics** screen (decision: reuse Analytics
     rather than a per-bot hub; simplest, reuses an existing screen).
   - **Zero-bots case:** a friendly view — *"Create your first bot on a
     computer"* — never a broken create flow. Bot creation is a build job,
     desktop-only.
2. **Inbox** — cross-bot list of conversations needing a human (handoff
   `requested`/`live`). Tap → conversation history + reply composer. Reuses the
   existing handoff reply path (`from_human` messages, polling). This is the
   only write-capable mobile screen besides lead status.
3. **Leads** — cross-bot list; each row taps to call (`tel:`) or email
   (`mailto:`). Read + quick-act; no editing beyond existing lead handling.
4. **Conversations** — read-only list → tap into full message history. Bot
   filter if the org has multiple bots.
5. **Analytics (per-bot)** — the existing `AnalyticsSection` reflowed to one
   column (stat cards stack, charts full-width). Reached from a Home bot card or
   the More tab (bot picker).

## Explicitly NOT on mobile

Configure, Knowledge, Embed, Team, Subscription. Not gated links, not
greyed-out rows — **absent from the nav**. The More tab carries one card:
*"Set up bots, knowledge, embedding, team and billing on the desktop version at
app.loqara.com."* Mobile assumes the bot already exists.

## Data

No new backend. All screens reuse existing server queries. Two views are
"unified across bots" (Inbox, Leads) — the org-level analytics page already
demonstrates the cross-bot aggregation pattern (query all `org_id` bots, filter
in memory), so Inbox/Leads follow it. New routes may be added for the unified
Inbox/Leads (desktop currently exposes these per-bot under
`bots/[botId]/inbox|leads`); the mobile tabs point at org-level equivalents.

## Architecture

- A responsive shell in `app/(client)/app/layout.tsx` (or a client wrapper):
  desktop `AppSidebar` at `md`+, `MobileTabBar` + top bar below `md`. CSS-driven
  (Tailwind `md:` variants) so there is no separate mobile route tree where
  avoidable; screens render responsively within the same routes.
- New components: `MobileTabBar`, `MobileTopBar`, mobile-reflowed variants (or
  responsive classes) for Home cards, Inbox list, Leads list, Conversations
  list/detail. Analytics reuses `AnalyticsSection` with responsive grid classes.
- Breakpoint: `md` (768px). Tablets ≥768 get the desktop layout (acceptable on
  the wider screen).

## Prerequisite

Verify the auth/sign-in pages (`app/(auth)/*`, separate from this portal shell)
already reflow on mobile — a client can't reach any of this if login is broken.
Small fix if needed; check first.

## Out of scope (future)

- Push notifications / PWA install — email is sufficient for now (confirmed).
- Mobile build/config screens.
- Native app wrapper.

## Open risks

- **Unified Inbox/Leads routes** are the only genuinely new surface (vs. pure
  restyle). If that expands scope, Phase 1 can point the tabs at the existing
  per-bot screens with a bot switcher instead, deferring true unification.
- Conversation reply on mobile must reuse the exact handoff path used on desktop
  to avoid divergence.
