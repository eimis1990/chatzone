# Access model

Two roles: **owner** (platform / us) and **client** (a store on the platform).

## Roles & onboarding

- `profiles.role` is the role. **RLS is column-blind**: a trigger (migration
  `0023`) locks `profiles.role` so a user can't escalate themselves.
- Invite → accept flow: owner invites an email, the client accepts, creates an
  account, and lands in their org. (Onboarding also seeds the bot's
  `allowedDomains` with the client's site — see [widget](widget-and-embed.md).)

## Owner "done-for-you"

- The owner can fully manage a client's bot at
  `/owner/clients/[orgId]/bots/[botId]/` — tabs **Configure / Knowledge / Embed**
  (`components/owner/OwnerBotTabs.tsx`).
- Owner writes use the **service client** (bypasses RLS) after `requireRole('owner')`;
  pages verify `bot.org_id === orgId`. The owner can also **create** a bot for a
  client (`createBotForOrg` → `createBotInOrg`).
- The owner reuses the client components (`ConfigForm`, `KnowledgeManager`,
  `EmbedSnippetPanel`) with an `audience="owner"` / service-backed save.
- Keep `/owner/clients/[orgId]` action hierarchy deliberate: account status and
  suspension belong in the header; blank bot creation is the primary Bots CTA;
  prepared-demo duplication is a secondary footer workflow; per-bot Configure
  actions stay aligned with live/status metadata. The bot rows collapse to a
  stacked layout with full-width Configure actions on narrow screens
  (`app/(owner)/owner/clients/[orgId]/page.tsx:178-314`,
  `components/owner/DuplicateDemoBotForm.tsx:22-65`).

## Owner signup triage

- `/owner/signups` derives New, Invited, and Accepted groups from the signup row
  plus the latest invite status (`app/(owner)/owner/signups/page.tsx:40-63`).
- Preserve the lifecycle-specific UI: New/Invited remain action cards, while
  Accepted is a compact responsive table that folds website/source/timeline
  metadata into the client cell on narrow screens
  (`app/(owner)/owner/signups/page.tsx:85-88`,
  `components/owner/AcceptedSignupsTable.tsx:22-142`). The shared removal action
  and confirmation live in `components/owner/SignupCard.tsx:40-90`.

## Security invariants (see `docs/SECURITY.md`)

- `profiles.role` locked by trigger (no self-escalation).
- `assertPublicUrl` SSRF guard on any server-side fetch of a user-supplied URL.
- Fail-closed cron jobs.
- From the 2026-07-01 full audit.

_Last verified: 2026-08-27 (db6525d)._
