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
  ([widget](widget-and-embed.md)), `proactiveGreeting`, `commerce`
  ([commerce](commerce.md)), `voice` ([voice](voice.md)).
- `proactiveGreeting` is opt-in and stores a delay (0–30s), page/session
  frequency, up to five `{text}` variants per language, and independent bubble
  colors/font/radius. When enabled, the primary language must have at least one
  variant (`lib/validation/schemas.ts:47`, `lib/validation/schemas.ts:279`).

## ConfigForm (`components/client/ConfigForm.tsx`)

- **Shared** by the client dashboard and the owner "done-for-you" editor. The
  owner passes `onSave={saveClientBotConfig}` (service-client write) and a
  `topSlot` with the owner tab bar; audience `'client'` hides the technical
  sections, `'owner'` shows all.
- Entitlement props (`maxLanguages`, `canUseLeadCapture`, `canUseVoice`) are UX
  gates; real enforcement is server-side ([entitlements](plans-and-entitlements.md)).
- Proactive greeting controls live under **Appearance → Greeting prompt**. Enabling it
  seeds any empty enabled language; adding another language while it is enabled
  seeds that language too (`components/client/ConfigForm.tsx:370`,
  `components/client/ConfigForm.tsx:470`, `components/client/ConfigForm.tsx:1181`).
- Appearance is organized by visitor-facing decisions rather than config shape:
  starting point → core palette (advanced colors disclosed) → shape → launcher →
  greeting prompt → chat surface. Color cards open a focused dialog containing
  the visual picker + optional hex input, so raw hex fields do not dominate the
  main form (`components/client/ConfigForm.tsx:1085`,
  `components/client/ConfigForm.tsx:2294`, `components/client/ConfigForm.tsx:2348`).
  `Scrubber` has a small two-line mode for dense settings grids while retaining
  the same pointer/keyboard behavior. In mixed settings grids, its visible label
  can be moved above the track (while the accessible name stays on the slider),
  keeping sliders aligned with selects and color fields
  (`components/ui/scrubber.tsx:10`, `components/client/ConfigForm.tsx:1112`).
  The floating live widget is rendered in a body-level portal so configurator
  ancestors cannot trap it below a modal backdrop. Color dialogs use an inline
  z-index of 40 for their backdrop, the preview uses 45, and dialog content uses
  the standard 50; this keeps the widget sharp above the blurred canvas while
  the dialog itself stays foremost. Valid picker/hex changes stream immediately;
  Apply commits them, while Cancel, Escape, backdrop-close, or the close button
  restores the value captured when the editor opened
  (`components/ui/dialog.tsx:42`, `components/client/ConfigForm.tsx:1630`,
  `components/client/ConfigForm.tsx:2469`).
- The entire configurator now uses the same visual hierarchy: the collapsible
  section names the feature area, then compact `SettingsGroup` cards organize
  related decisions. Display separates identity/imagery/privacy; Language &
  content separates language setup from localized content; AI separates core
  instructions from response style; Lead capture separates activation from its
  trigger/form; Store, Voice, and Allowed domains follow the same status-then-
  details pattern (`components/client/ConfigForm.tsx:592`,
  `components/client/ConfigForm.tsx:706`, `components/client/ConfigForm.tsx:1321`,
  `components/client/VoiceSection.tsx:186`).
- Available languages use a multi-select popover; primary language remains a
  separate select because it controls the language the widget opens with. The
  language tabs now appear inside the localized-content card and only choose
  which copy is being edited (`components/client/ConfigForm.tsx:712`).
- Expanded section bodies reuse the header's muted surface (without the header
  grid), so the white `SettingsGroup` cards read as a distinct content layer.
  Compact scrubbers intentionally match default selects at 40px height and the
  shared `--radius-md` corner radius (`components/ui/scrubber.tsx:151`).
- Config sections form one continuous stack: the shared section card removes
  inherited card spacing, headers are white with a primary-tinted left-edge
  gradient, and expanded bodies remain muted behind the inner cards
  (`components/client/CollapsibleSection.tsx:22`, `app/globals.css:180`).
  Each header owns the stack's only 1px divider. The gradient is an expanded-
  state cue: it fades and slides in on open, remains hidden while collapsed,
  and disables its transition for reduced-motion users.
- **Save & Publish** is disabled until either React Hook Form reports a dirty
  config field or the separately-managed bot name differs from its last saved
  value. A successful save resets both dirty baselines
  (`components/client/ConfigForm.tsx:311`, `components/client/ConfigForm.tsx:493`,
  `components/client/ConfigForm.tsx:590`).

## Owner bot editor

`app/(owner)/owner/clients/[orgId]/bots/[botId]/` — tabs **Configure /
Knowledge / Embed** via `components/owner/OwnerBotTabs.tsx`. The owner can also
create a bot for a client (`createBotForOrg`). See [access-model](access-model.md).

## System prompts

Owner-only `system_prompts` table + `/owner/prompts`. A bot references one via
`config.systemPromptId`, which snapshots the content into `config.systemPrompt`
(runtime reads the snapshot). Editing a prompt re-pushes to referencing bots.

_Last verified: 2026-07-10._
