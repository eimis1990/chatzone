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

## Password reset

Own flow, no Supabase auth email. `requestPasswordReset` (`app/(auth)/reset-password/actions.ts`)
mints a recovery token with `auth.admin.generateLink({ type: 'recovery' })` and
emails `${NEXT_PUBLIC_APP_URL}/reset-password?token_hash=…` from hello@loqara.com
(`passwordResetEmail` in `lib/notify.ts`). The page exchanges the hash with
`verifyOtp({ type: 'recovery', token_hash })` (single-use, 1 h) and then calls
`updateUser({ password })`. Always answers "if an account exists…" — no enumeration.
Why not `resetPasswordForEmail`: its link bounces through Supabase's verify
endpoint, whose fallback Site URL is still `http://localhost:3000`
(see gotchas), and PKCE requires the same browser that requested the reset.
⚠️ No per-address cooldown on the request action yet.

## Deleting a client

**Delete client** on the client detail page (`DeleteClientButton` → `deleteOrganization`
→ `lib/orgs/delete.ts`) requires typing the org name. Refuses the platform org and any
org with a live Stripe subscription (`trialing|active|past_due` + subscription id) —
cancel in Stripe first. Deletes ElevenLabs agents (best effort), then the org row
(FK cascades cover bots/knowledge/conversations/leads/events/members/invites/orders),
then auth users who belonged ONLY to that org and are not owners
(`usersToDeleteWithOrg`, tested in `tests/unit/org-delete-policy.test.ts`).
Not cleaned: `public-assets` storage objects (logos), `bug_reports.org_id` is set null.

## Owner signup triage

- `/owner/signups` derives New, Invited, and Accepted groups from the signup row
  plus the newest invite sent AT/AFTER that signup (`inviteStatusForSignup`,
  `lib/invites.ts`). Older invites for the same email are ignored on purpose: an
  onboarded client who signs up again (after the owner deleted the old row)
  shows as New, not Accepted. Note `signups.email` is unique — the landing form
  silently no-ops (`recorded: false`) while an old row still exists.
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
