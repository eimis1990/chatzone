# Bot config

## Schema (`lib/validation/schemas.ts`)

- `botConfigFormSchema` — plain shape for the RHF form (Zod input type).
- `botConfigSchema` = `botConfigFormSchema` with a `normalizeBotConfig` preprocess
  (upgrades legacy flat configs → per-language `content` + `languages[]`) and a
  `superRefine` (content required per enabled language; `defaultLanguage ∈
  languages`).
- `defaultBotConfig(name)` — starter config for a new bot (English, one bot).
- Config holds: display/theme, `languages`/`content` ([i18n](languages-i18n.md)),
  `systemPrompt`(+`systemPromptId`), `persona`, `leadCapture`, `allowedDomains`
  ([widget](widget-and-embed.md)), `commerce` ([commerce](commerce.md)), `voice`
  ([voice](voice.md)).

## ConfigForm (`components/client/ConfigForm.tsx`)

- **Shared** by the client dashboard and the owner "done-for-you" editor. The
  owner passes `onSave={saveClientBotConfig}` (service-client write) and a
  `topSlot` with the owner tab bar; audience `'client'` hides the technical
  sections, `'owner'` shows all.
- Entitlement props (`maxLanguages`, `canUseLeadCapture`, `canUseVoice`) are UX
  gates; real enforcement is server-side ([entitlements](plans-and-entitlements.md)).

## Owner bot editor

`app/(owner)/owner/clients/[orgId]/bots/[botId]/` — tabs **Configure /
Knowledge / Embed** via `components/owner/OwnerBotTabs.tsx`. The owner can also
create a bot for a client (`createBotForOrg`). See [access-model](access-model.md).

## System prompts

Owner-only `system_prompts` table + `/owner/prompts`. A bot references one via
`config.systemPromptId`, which snapshots the content into `config.systemPrompt`
(runtime reads the snapshot). Editing a prompt re-pushes to referencing bots.

_Last verified: 2026-07-08 (66f6bb8)._
