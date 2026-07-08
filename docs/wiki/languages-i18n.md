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

## Free tier

`maxLanguages: 1` → the client picks **one** language of their choice (becomes
primary); the switcher is disabled. See [plans-and-entitlements](plans-and-entitlements.md).

## Flow

- **Form:** `ConfigForm` has an explicit "Available languages" control (multi-
  select on paid, single-select on free), a primary dropdown (locked on free),
  and the switcher toggle. The RHF resolver runs `normalizeLanguageSelection`
  (`lib/validation/normalize-languages.ts`): prunes content to selected, forces
  primary ∈ selection, disables the switcher when <2. Initial form values are
  clamped to `maxLanguages` so a downgraded bot renders locked.
- **Widget:** `publicBotConfig` clamps served languages to `maxLanguages` around
  the primary; `ChatWindow.tsx` renders the flag switcher only when
  `languages.length > 1 && showLanguageSelector`.

_Last verified: 2026-07-08 (66f6bb8)._
