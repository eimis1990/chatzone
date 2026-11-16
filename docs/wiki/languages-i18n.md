# Languages / i18n

Per-bot visitor-language selection. Only `en` and `lt` are supported today;
adding a language is one registry entry (+ its content/voice).

## Registry

`lib/i18n/languages.ts` — `SUPPORTED_LANGUAGES` (`{ code, label, nativeLabel,
flag }`, ordered), `SUPPORTED_LANGUAGE_CODES`, `languageMeta(code)`. The config
form uses `label` (English name); the widget switcher uses `nativeLabel` (endonym).

## Config shape (`botConfigSchema`)

- `languages: BotLanguage[]` — the available set (≥1).
- `defaultLanguage` — the primary; must be ∈ `languages` (superRefine enforces).
- `showLanguageSelector` — the visitor switcher; only meaningful with ≥2 languages.
- `content` — a **fully-optional** per-language record. Content is required for
  each language in `languages[]` (superRefine), **not** English-anchored — a bot
  can be Lithuanian-only. Don't assume `content.en` (see [gotchas](gotchas.md)).

## Free and Basic

`maxLanguages: 1` → the client picks **one** language of their choice (becomes
primary); the switcher is disabled. See [plans-and-entitlements](plans-and-entitlements.md).

## Flow

- **Form:** `ConfigForm` has an explicit "Available languages" control (multi-
  select on Starter+, single-select on Free/Basic), a primary dropdown (locked on Free/Basic),
  and the switcher toggle. The RHF resolver runs `normalizeLanguageSelection`
  (`lib/validation/normalize-languages.ts`): prunes content to selected, forces
  primary ∈ selection, disables the switcher when <2. Initial form values are
  clamped to `maxLanguages` so a downgraded bot renders locked.
- **Widget:** `publicBotConfig` clamps served languages to `maxLanguages` around
  the primary; `ChatWindow.tsx` renders the flag switcher only when
  `languages.length > 1 && showLanguageSelector`.

## Greeting and fallback templates

- `lib/i18n/message-templates.ts:4` provides English/Lithuanian starter copy with
  emojis. Fallback copy does not promise lead capture or a human follow-up, since
  those features may be disabled. `defaultBotConfig` uses the English templates.
- `components/client/ConfigForm.tsx:523` fills missing/blank messages on load and
  language-selection changes, preserving custom text and quick actions. It marks
  seeded fields dirty so Save & Publish can persist them. The effect depends on
  the language selection, never message edits, so clearing a textarea to rewrite
  it does not refill it mid-edit. Each message also has a **Use template** button
  that explicitly replaces that field with the active language's starter copy.
- Saved configs are not migrated; templates are editable form defaults. Existing
  published messages stay unchanged until saved.

_Last verified: 2026-07-08 (66f6bb8)._

- Basic also has one chosen language. Server actions reject an excess selection;
  runtime policy clamps it and preserves dormant translations for re-upgrade
  (`lib/organization-policy.ts:27`). Verified 2026-11-16.
