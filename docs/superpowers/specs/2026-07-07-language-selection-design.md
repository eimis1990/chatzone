# Flexible language selection + free-tier single language

**Date:** 2026-07-07
**Status:** Approved design → implementation

## Problem

The Language & content section of the bot configurator hardcodes an
"English-base + Lithuanian-extra" model:

- Available languages are *derived* from whether Lithuanian content is filled
  (`withEnabledLanguagesOnly` in `ConfigForm.tsx`), not chosen explicitly.
- The free tier is locked to English (`entitlements.allLanguages = false`,
  enforced in `publicBotConfig` by forcing `['en']`).
- `content.en` is a required schema field, so a bot cannot be
  non-English-only.

Desired: the client explicitly selects which supported languages are
**available** to their visitors, picks a **primary**, and toggles the
visitor-facing **language switcher** — future-proof as more languages are
added. On the **free tier** the client may still choose *which* single
language they want (e.g. Lithuanian-only); it becomes the primary and the
switcher is disabled.

## Scope

Support the two languages that exist today (English, Lithuanian) but restructure
so adding a language later is a single registry entry (plus its content/voice).
No speculative N-language infrastructure beyond the registry.

## What already works (no change needed)

The widget runtime and public config are already generic:

- `publicBotConfig` (`lib/widget-config.ts`) carries `languages`,
  `defaultLanguage`, `showLanguageSelector`, and per-language `content` to the
  widget; auto-forces `showLanguageSelector = false` when `languages.length <= 1`;
  and falls back `defaultLanguage → languages[0]`.
- `ChatWindow.tsx` renders the flag switcher only when
  `languages.length > 1 && showLanguageSelector`, and resolves active-language
  content with a `content[languages[0]]` fallback.

So the visitor experience needs **one** server change (§4); the rest is the
configurator UI, the entitlement, and the schema.

## Design

### 1. Shared language registry

Introduce one ordered `SUPPORTED_LANGUAGES` registry: `{ code, label, flag }`
per language (`en` 🇬🇧 English, `lt` 🇱🇹 Lietuvių). Replace the duplicated
`LANG_LABELS` (ConfigForm) and `LANG_META` (ChatWindow) with references to it.
Adding a language later = one entry here + its content/voice support.

Location: `lib/i18n/languages.ts` (new). The `BotLanguage` enum in
`schemas.ts`/`types.ts` stays the source of valid codes; the registry provides
display metadata and iteration order.

### 2. Entitlements

Replace `allLanguages: boolean` with `maxLanguages: number` in
`lib/entitlements.ts`:

- `free`: `maxLanguages: 1`
- `starter` / `growth` / `scale` / `enterprise`: `maxLanguages: Infinity`

Update consumers:

- `app/(client)/app/bots/[botId]/configure/page.tsx` and
  `app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/page.tsx`: pass
  `maxLanguages={ent.maxLanguages}` to `ConfigForm` instead of
  `canUseAllLanguages`.
- `app/(owner)/owner/chatbot/page.tsx`: pass `maxLanguages={Infinity}` (was
  `canUseAllLanguages`).
- `tests/unit/entitlements.test.ts`: assert `maxLanguages` per plan.

### 3. Schema — de-anchor content from English

In `lib/validation/schemas.ts`:

- Change `content` from `{ en: required, lt: optional }` to a partial
  per-language record (`{ en?: ..., lt?: ... }`).
- Keep/extend the existing `superRefine` so that **every** language in
  `languages[]` has valid `languageContentSchema` content, and add a check that
  `defaultLanguage ∈ languages` (when set).
- `defaultBotConfig` unchanged (`languages: ['en']`, `content.en` present).
- `normalizeBotConfig` unchanged — legacy configs still backfill `content.en`
  and `languages`.

**No data migration:** all existing bots already have `content.en` and an `en`
entry in `languages`, so they remain valid.

### 4. Widget-config clamp (the one runtime change)

`lib/widget-config.ts`, currently:

```ts
const languages = entitlements && !entitlements.allLanguages
  ? ['en']
  : (config.languages ?? ['en'])
```

becomes: clamp to the first `maxLanguages` of the bot's configured languages,
prioritizing `defaultLanguage`:

```ts
const configured = config.languages ?? ['en']
const primary = config.defaultLanguage && configured.includes(config.defaultLanguage)
  ? config.defaultLanguage
  : configured[0] ?? 'en'
const limit = entitlements?.maxLanguages ?? Infinity
// Primary first, then the rest, capped at the plan limit.
const languages = [primary, ...configured.filter((l) => l !== primary)].slice(0, limit)
```

Effects:
- Free bot serves its **chosen** primary (Lithuanian-only works).
- A paid bot that downgrades to free collapses to its primary; the switcher
  auto-turns off (existing `languages.length > 1` guard). Stored config is
  untouched, so re-upgrading restores all languages.

### 5. ConfigForm UI (the main work)

Replace the derived-from-`ltFilled` model with an explicit **Available
languages** control in the Language & content section.

- **Available languages** control over `SUPPORTED_LANGUAGES`:
  - **Paid (`maxLanguages > 1`):** multi-select chips; at least one required.
  - **Free (`maxLanguages === 1`):** single-select (radio behaviour); picking a
    language replaces the current selection. An "Upgrade to offer more
    languages" hint sits alongside.
- **Primary language** dropdown: always shown, options limited to the selected
  available languages. On free tier it is present but **locked/disabled** to the
  single selected language (auto-follows the selection).
- **Let visitors switch language** toggle: enabled only when `maxLanguages > 1`
  *and* ≥2 languages are selected; disabled otherwise (with the upgrade hint on
  free). Its stored value is forced `false` when <2 languages are available.
- **Per-language content tabs** iterate the selected available languages (not a
  hardcoded `['en','lt']`), using the registry for labels.
- **Save transform** (`withEnabledLanguagesOnly`): derive `languages` from the
  explicit selection; prune `content` to the selected languages; ensure
  `defaultLanguage ∈ selection` (fallback to the first selected); force
  `showLanguageSelector = false` when <2 selected.
- Replace the `canUseAllLanguages: boolean` prop with `maxLanguages: number`.

### Components / boundaries

| Unit | Responsibility | Change |
| --- | --- | --- |
| `lib/i18n/languages.ts` | Supported-language registry (code/label/flag/order) | New |
| `lib/entitlements.ts` | `maxLanguages` per plan | Replace `allLanguages` |
| `lib/validation/schemas.ts` | `content` partial + `superRefine` primary check | Modify |
| `lib/widget-config.ts` | Clamp served languages to plan limit around primary | Modify (§4) |
| `components/client/ConfigForm.tsx` | Explicit available-languages UI + save transform | Main change |
| configure pages (client + owner) + owner/chatbot | Pass `maxLanguages` | Modify |
| `components/widget/ChatWindow.tsx` | Use registry for flag/label | Minor |
| `tests/unit/entitlements.test.ts` | Assert `maxLanguages` | Modify |

## Testing

- **entitlements.test.ts:** `maxLanguages` is 1 for free, Infinity for paid.
- **widget-config:** unit test the clamp — free bot with `languages: ['en','lt']`,
  `defaultLanguage: 'lt'` serves `['lt']` with `showLanguageSelector: false`;
  paid bot serves both.
- **schema:** a config with `languages: ['lt']`, `content: { lt: {...} }`, no
  `content.en` validates; a config whose `defaultLanguage` is not in `languages`
  fails.
- **Manual:** free bot → single language selectable, primary locked, switcher
  disabled, widget opens in the chosen language; paid bot → multi-select,
  switcher works in the widget.

## Out of scope

- Adding new languages (fr, de, …) — content, voice models, AI prompts.
- Auto-translating content between languages.
- Any change to the voice-language mapping beyond what the registry enables.
