# System prompt versioning — design

Date: 2026-07-27 · Status: approved by owner

## Problem

Editing a library prompt (`system_prompts`) instantly re-pushes content to every
referencing bot across all client orgs (`app/(owner)/owner/prompts/actions.ts`,
`updateSystemPrompt`). No history exists; a bad edit breaks live client widgets
with nothing to roll back to.

## Decisions (from brainstorming)

- **Two slots per bot**: *Live version* (runs the live widget) and *Preview
  version* (runs the test playground). Client or owner promotes preview → live
  after testing.
- **No push step**: publishing a version makes it visible in the dropdowns of
  every bot on that prompt family. Nothing ever auto-applies.
- **Draft + explicit publish**: `system_prompts.content` becomes the draft;
  "Publish" freezes it as immutable v1, v2, … with an optional note.
- Clients never see raw prompt text — only version number, note, date. The
  client-facing section is called **"Assistant version"**.

## Data model

New table `system_prompt_versions`:
`id uuid pk · prompt_id → system_prompts (cascade) · version int ·
content text (immutable) · note text · published_at · published_by`,
`unique (prompt_id, version)`. RLS: owner-only (same as `system_prompts`).

`BotConfig` gains `systemPromptVersionId?` (live) and
`previewSystemPromptVersionId?`. The existing `systemPrompt` snapshot stays —
**the `/api/chat` runtime is untouched**.

## Mechanics

- **Snapshot resolution on save** (the key simplification): both bot-config
  save actions (client and owner) run a shared server-side step after schema
  parse — if `systemPromptVersionId` is set, fetch that version's content with
  the service client, validate it belongs to `config.systemPromptId`'s family,
  and overwrite `config.systemPrompt` before persisting. Version selection
  therefore flows through the existing Save & publish path; no separate apply
  endpoint, no client access to content, no clobber races. `syncVoiceAgent`
  already runs on save.
- **Preview**: `/api/preview/chat` — when the request config carries
  `previewSystemPromptVersionId`, the server fetches that version's content
  (service client, validated against the *saved* bot's prompt family) and
  overrides `config.systemPrompt` for that run.
- **Publishing**: insert next `max(version)+1` row. The bulk re-push loop in
  `updateSystemPrompt` is deleted; editing saves the draft only.

## Screens

- **Owner sidebar**: new parent item **Versioning** with child **System
  prompts** → `/owner/prompts` (replaces the top-level item). More children
  (Components, …) come later.
- **/owner/prompts**: per-prompt card gains Publish (dialog w/ note), an
  "unpublished changes" badge when draft ≠ latest version, and a version
  history panel: vN · note · date · usage ("4 bots on v3"), expandable to the
  bot/org list (page already loads all bot configs).
- **Owner ConfigForm** (`SystemPromptSelect`): Live + Preview version dropdowns
  next to the family picker; owner still sees content preview. Custom
  free-text path unchanged for unlinked bots.
- **Client Configure**: new "Assistant version" section (only when the bot is
  library-linked): Live + Preview dropdowns with metadata-only options and a
  "New version available" hint when Live < newest. Saved via the normal form
  save. While a Preview version is selected, prompt free-text (owner side) is
  read-only.
- Version metadata for client dropdowns is served by a server action that
  verifies bot access, then reads versions via service client.

## Migration

Same SQL migration: for each existing prompt insert v1 from current content;
set `systemPromptVersionId` on bots where `config->>'systemPromptId'` matches
and the snapshot text equals that content (mismatches stay unlinked → shown as
custom).

## Skipped deliberately

Version archiving, per-org visibility/staged rollout, version diffs,
components/theme versioning (nav pattern ready).
