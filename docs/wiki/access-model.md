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

## Security invariants (see `docs/SECURITY.md`)

- `profiles.role` locked by trigger (no self-escalation).
- `assertPublicUrl` SSRF guard on any server-side fetch of a user-supplied URL.
- Fail-closed cron jobs.
- From the 2026-07-01 full audit.

_Last verified: 2026-07-08 (seeded from notes + this session's owner work)._
