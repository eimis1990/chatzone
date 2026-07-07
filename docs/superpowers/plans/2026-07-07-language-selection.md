# Flexible Language Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a bot's owner explicitly choose which supported languages are available to visitors, pick a primary, and toggle the visitor switcher — with the free tier limited to one language of their choice (which may be non-English).

**Architecture:** A shared `SUPPORTED_LANGUAGES` registry drives the config form and widget. Availability becomes an explicit selection (`config.languages`) instead of being derived from whether Lithuanian content is filled. A `maxLanguages` entitlement (free = 1) is enforced in the form and, authoritatively, in `publicBotConfig`, which clamps the served languages around the bot's primary. Content is de-anchored from English so a bot can be single-language in any supported language.

**Tech Stack:** Next.js (App Router), TypeScript, Zod, react-hook-form, Vitest.

## Global Constraints

- Only `en` and `lt` are supported languages today (`BotLanguage = 'en' | 'lt'`). Do not add new language codes.
- Run tests with: `npm test -- <path>` (the `test` script sets `NODE_OPTIONS=--experimental-require-module`; plain `npx vitest` fails with `ERR_REQUIRE_ESM`).
- No data migration: every existing bot already has `content.en` and `en` in `languages`; all changes must keep those configs valid.
- Free-tier UX decision: the Primary-language dropdown is always shown; on free tier it is present but disabled/locked to the single selected language.
- `publicBotConfig` is the single public entry point for the widget — plan gating for languages is enforced there.

---

### Task 1: Shared language registry

**Files:**
- Create: `lib/i18n/languages.ts`
- Test: `tests/unit/languages.test.ts`
- Modify: `components/widget/ChatWindow.tsx` (replace local `LANG_META`)

**Interfaces:**
- Produces:
  - `SupportedLanguage = { code: BotLanguage; label: string; nativeLabel: string; flag: string }`
  - `SUPPORTED_LANGUAGES: readonly SupportedLanguage[]` (ordered: en, lt)
  - `SUPPORTED_LANGUAGE_CODES: readonly BotLanguage[]`
  - `languageMeta(code: BotLanguage): SupportedLanguage`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/languages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  languageMeta,
} from '@/lib/i18n/languages'

describe('language registry', () => {
  it('lists English first, then Lithuanian', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(['en', 'lt'])
  })

  it('exposes English + native labels and a flag per language', () => {
    const lt = languageMeta('lt')
    expect(lt.label).toBe('Lithuanian')
    expect(lt.nativeLabel).toBe('Lietuvių')
    expect(lt.flag).toBe('🇱🇹')
    expect(languageMeta('en').label).toBe('English')
  })

  it('every registry entry has all display fields', () => {
    for (const l of SUPPORTED_LANGUAGES) {
      expect(l.code).toBeTruthy()
      expect(l.label).toBeTruthy()
      expect(l.nativeLabel).toBeTruthy()
      expect(l.flag).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/languages.test.ts`
Expected: FAIL — cannot find module `@/lib/i18n/languages`.

- [ ] **Step 3: Create the registry**

Create `lib/i18n/languages.ts`:

```ts
import type { BotLanguage } from '@/lib/types'

/** Display metadata for a supported bot language. */
export interface SupportedLanguage {
  code: BotLanguage
  /** English name — used in the config UI. */
  label: string
  /** Endonym — used in the widget's visitor-facing switcher. */
  nativeLabel: string
  flag: string
}

/**
 * The languages the platform supports, in display order. Adding a language
 * later = one entry here (plus its content/voice support elsewhere).
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'lt', label: 'Lithuanian', nativeLabel: 'Lietuvių', flag: '🇱🇹' },
]

export const SUPPORTED_LANGUAGE_CODES: readonly BotLanguage[] = SUPPORTED_LANGUAGES.map(
  (l) => l.code,
)

/** Metadata for a code, falling back to the first language for unknown codes. */
export function languageMeta(code: BotLanguage): SupportedLanguage {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/languages.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Point ChatWindow at the registry**

In `components/widget/ChatWindow.tsx`, delete the local `LANG_META` const (currently around lines 51–54):

```ts
const LANG_META: Record<string, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
  lt: { flag: '🇱🇹', label: 'Lietuvių' },
}
```

Add the import near the other `@/lib` imports:

```ts
import { languageMeta } from '@/lib/i18n/languages'
```

Then find every use of `LANG_META`:

Run: `grep -n "LANG_META" components/widget/ChatWindow.tsx`

Replace each `LANG_META[<expr>].flag` with `languageMeta(<expr>).flag`, and each `LANG_META[<expr>].label` with `languageMeta(<expr>).nativeLabel` (the widget switcher shows endonyms — this preserves "Lietuvių").

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/i18n/languages.ts tests/unit/languages.test.ts components/widget/ChatWindow.tsx
git commit -m "feat(i18n): shared supported-languages registry"
```

---

### Task 2: Add `maxLanguages` entitlement

**Files:**
- Modify: `lib/entitlements.ts`
- Test: `tests/unit/entitlements.test.ts`

**Interfaces:**
- Produces: `Entitlements.maxLanguages: number` (free = 1, all paid = `Infinity`). `allLanguages` stays for now (removed in Task 6, once no code reads it).

- [ ] **Step 1: Add the failing assertions**

In `tests/unit/entitlements.test.ts`, add to the Free test (after the `allLanguages` line):

```ts
    expect(e.maxLanguages).toBe(1)
```

Add to the Starter test:

```ts
    expect(e.maxLanguages).toBe(Infinity)
```

Add a new test inside the describe block:

```ts
  it('language limit: 1 on free, unlimited on every paid tier', () => {
    expect(entitlementsFor('free').maxLanguages).toBe(1)
    for (const p of ['starter', 'growth', 'scale', 'enterprise'] as const) {
      expect(entitlementsFor(p).maxLanguages).toBe(Infinity)
    }
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/entitlements.test.ts`
Expected: FAIL — `maxLanguages` is `undefined`.

- [ ] **Step 3: Add the field to the entitlements**

In `lib/entitlements.ts`, add to the `Entitlements` interface (below `allLanguages`):

```ts
  /** Max distinct visitor languages a bot may offer (1 = single language). */
  maxLanguages: number
```

Add `maxLanguages` to each plan in `ENTITLEMENTS`:
- `free`: `maxLanguages: 1,`
- `starter`, `growth`, `scale`, `enterprise`: `maxLanguages: Infinity,`

(Leave `allLanguages` in place for now.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/entitlements.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/entitlements.ts tests/unit/entitlements.test.ts
git commit -m "feat(entitlements): add maxLanguages (free=1)"
```

---

### Task 3: Clamp served languages around the primary

**Files:**
- Modify: `lib/widget-config.ts:129-130`
- Test: `tests/unit/widget-config.test.ts`

**Interfaces:**
- Consumes: `Entitlements.maxLanguages` (Task 2).
- Produces: unchanged `publicBotConfig` signature; new clamp behavior (free serves the bot's chosen primary, not forced English).

- [ ] **Step 1: Update the failing tests**

In `tests/unit/widget-config.test.ts`, replace the "Free plan: English only…" test (currently lines ~161-169) with the new clamp behavior:

```ts
  it('Free plan: clamps to the chosen primary language (may be non-English)', () => {
    const pub = publicBotConfig(maxedConfig, entitlementsFor('free'))
    expect(pub.languages).toEqual(['lt']) // maxedConfig.defaultLanguage === 'lt'
    expect(pub.defaultLanguage).toBe('lt')
    expect(pub.content.lt).toBeDefined()
    expect(pub.content.en).toBeUndefined()
    expect(pub.showLanguageSelector).toBe(false)
    expect(pub.leadCapture.enabled).toBe(false)
    expect(pub.hideBadge).toBe(false)
  })

  it('Free plan with an English-only bot still serves English', () => {
    const pub = publicBotConfig(fullConfig, entitlementsFor('free'))
    expect(pub.languages).toEqual(['en'])
    expect(pub.defaultLanguage).toBe('en')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/widget-config.test.ts`
Expected: FAIL — current code returns `['en']` for the free maxedConfig.

- [ ] **Step 3: Implement the clamp**

In `lib/widget-config.ts`, replace:

```ts
  const languages: BotLanguage[] =
    entitlements && !entitlements.allLanguages ? ['en'] : (config.languages ?? ['en'])
```

with:

```ts
  // Plan-gating: cap the number of visitor languages at the plan's limit,
  // keeping the bot's chosen primary first so a single-language plan serves
  // exactly that language (not a hardcoded English).
  const configured = config.languages ?? ['en']
  const primary =
    config.defaultLanguage && configured.includes(config.defaultLanguage)
      ? config.defaultLanguage
      : (configured[0] ?? 'en')
  const limit = entitlements?.maxLanguages ?? Infinity
  const languages: BotLanguage[] = [
    primary,
    ...configured.filter((l) => l !== primary),
  ].slice(0, limit)
```

(The existing lines below — `defaultLanguage` falling back to `languages[0]`, and `showLanguageSelector = languages.length > 1 && …` — already handle the single-language case correctly.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/widget-config.test.ts`
Expected: PASS (all describe blocks).

- [ ] **Step 5: Commit**

```bash
git add lib/widget-config.ts tests/unit/widget-config.test.ts
git commit -m "feat(widget-config): clamp languages around chosen primary by plan"
```

---

### Task 4: De-anchor content from English

**Files:**
- Modify: `lib/validation/schemas.ts:157-160` (content shape) and `:224-235` (superRefine)
- Modify: `lib/types.ts:214` (`BotConfig.content` type)
- Test: `tests/unit/botConfig.test.ts`

**Interfaces:**
- Produces: `content` is a fully-optional per-language record; `botConfigSchema` requires content for each language in `languages[]` and requires `defaultLanguage ∈ languages` when set.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/botConfig.test.ts` (inside the `botConfigSchema` describe or a new one):

```ts
describe('botConfigSchema — language rules', () => {
  const base = {
    displayName: 'Bot',
    systemPrompt: 'You are helpful.',
  }

  it('accepts a Lithuanian-only bot (no English content)', () => {
    const parsed = botConfigSchema.parse({
      ...base,
      languages: ['lt'],
      defaultLanguage: 'lt',
      content: { lt: { greeting: 'Labas!', suggestedQuestions: [], fallbackMessage: 'Ne.' } },
    })
    expect(parsed.languages).toEqual(['lt'])
    expect(parsed.content.en).toBeUndefined()
    expect(parsed.content.lt?.greeting).toBe('Labas!')
  })

  it('rejects an enabled language with no content', () => {
    const res = botConfigSchema.safeParse({
      ...base,
      languages: ['en', 'lt'],
      content: { en: { greeting: 'Hi', suggestedQuestions: [], fallbackMessage: 'No.' } },
    })
    expect(res.success).toBe(false)
  })

  it('rejects a primary language that is not enabled', () => {
    const res = botConfigSchema.safeParse({
      ...base,
      languages: ['en'],
      defaultLanguage: 'lt',
      content: { en: { greeting: 'Hi', suggestedQuestions: [], fallbackMessage: 'No.' } },
    })
    expect(res.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/botConfig.test.ts`
Expected: FAIL — the Lithuanian-only case throws (content.en required), and the bad-primary case currently succeeds.

- [ ] **Step 3: Make content fully optional**

In `lib/validation/schemas.ts`, replace:

```ts
  content: z.object({
    en: languageContentSchema,
    lt: languageContentSchema.optional(),
  }),
```

with:

```ts
  // Per-language content. All optional at the field level; botConfigSchema's
  // superRefine requires content for each language in `languages[]`.
  content: z.object({
    en: languageContentSchema.optional(),
    lt: languageContentSchema.optional(),
  }),
```

- [ ] **Step 4: Extend the superRefine**

In `lib/validation/schemas.ts`, replace the `.superRefine(...)` body (the enabled-language loop) with:

```ts
  .superRefine((cfg, ctx) => {
    // Every enabled language must have content.
    for (const lang of cfg.languages) {
      if (!cfg.content[lang]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing ${lang === 'lt' ? 'Lithuanian' : 'English'} content for an enabled language`,
          path: ['content', lang],
        })
      }
    }
    // Primary language must be one of the enabled languages.
    if (cfg.defaultLanguage && !cfg.languages.includes(cfg.defaultLanguage)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Primary language must be one of the enabled languages',
        path: ['defaultLanguage'],
      })
    }
  })
```

- [ ] **Step 5: Update the BotConfig type**

In `lib/types.ts`, replace line 214:

```ts
  content: Partial<Record<BotLanguage, LanguageContent>> & { en: LanguageContent }
```

with:

```ts
  content: Partial<Record<BotLanguage, LanguageContent>>
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test -- tests/unit/botConfig.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: no errors. (If a consumer relied on `content.en` being non-optional, fix by using optional access `config.content.en?` — `publicBotConfig` already uses optional access.)

- [ ] **Step 7: Commit**

```bash
git add lib/validation/schemas.ts lib/types.ts tests/unit/botConfig.test.ts
git commit -m "feat(schema): allow single non-English language; validate primary"
```

---

### Task 5: Explicit-selection normalize helper (pure)

**Files:**
- Create: `lib/validation/normalize-languages.ts`
- Test: `tests/unit/normalize-languages.test.ts`

**Interfaces:**
- Consumes: `SUPPORTED_LANGUAGE_CODES` (Task 1); `FormValues = z.input<typeof botConfigFormSchema>`.
- Produces: `normalizeLanguageSelection(values: FormValues): FormValues` — derives `languages` from the explicit selection, prunes `content` to selected languages, forces `defaultLanguage ∈ selection`, and forces `showLanguageSelector = false` when fewer than 2 languages are selected.

This replaces the in-component `withEnabledLanguagesOnly` (which derived Lithuanian from filled content). Extracted to a React-free module so it is unit-testable and the RHF resolver can call it.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/normalize-languages.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeLanguageSelection } from '@/lib/validation/normalize-languages'
import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigFormSchema>

const c = (greeting: string) => ({ greeting, suggestedQuestions: [], fallbackMessage: 'x' })

function make(partial: Partial<FormValues>): FormValues {
  return { displayName: 'Bot', systemPrompt: 'You are helpful.', ...partial } as FormValues
}

describe('normalizeLanguageSelection', () => {
  it('prunes content for unselected languages', () => {
    const out = normalizeLanguageSelection(
      make({ languages: ['en'], content: { en: c('Hi'), lt: c('Labas') } }),
    )
    expect(out.languages).toEqual(['en'])
    expect(out.content?.lt).toBeUndefined()
    expect(out.content?.en).toBeDefined()
  })

  it('forces defaultLanguage into the selection', () => {
    const out = normalizeLanguageSelection(
      make({ languages: ['lt'], defaultLanguage: 'en', content: { lt: c('Labas') } }),
    )
    expect(out.defaultLanguage).toBe('lt')
  })

  it('turns off the switcher when fewer than two languages are selected', () => {
    const out = normalizeLanguageSelection(
      make({ languages: ['lt'], showLanguageSelector: true, content: { lt: c('Labas') } }),
    )
    expect(out.showLanguageSelector).toBe(false)
  })

  it('keeps the switcher value when two languages are selected', () => {
    const out = normalizeLanguageSelection(
      make({
        languages: ['en', 'lt'],
        showLanguageSelector: true,
        content: { en: c('Hi'), lt: c('Labas') },
      }),
    )
    expect(out.showLanguageSelector).toBe(true)
  })

  it('falls back to English when the selection is empty', () => {
    const out = normalizeLanguageSelection(make({ languages: [], content: { en: c('Hi') } }))
    expect(out.languages).toEqual(['en'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/normalize-languages.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `lib/validation/normalize-languages.ts`:

```ts
import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'
import { SUPPORTED_LANGUAGE_CODES } from '@/lib/i18n/languages'
import type { BotLanguage } from '@/lib/types'

type FormValues = z.input<typeof botConfigFormSchema>

/**
 * Normalize a form's language selection before validation/save:
 * - keep only supported, explicitly-selected languages (fall back to English),
 * - prune content for unselected languages,
 * - force the primary language into the selection,
 * - disable the visitor switcher unless 2+ languages are selected.
 * React-free so it is unit-testable and reusable by the RHF resolver.
 */
export function normalizeLanguageSelection(values: FormValues): FormValues {
  let languages = (values.languages ?? ['en']).filter((l): l is BotLanguage =>
    SUPPORTED_LANGUAGE_CODES.includes(l as BotLanguage),
  )
  if (languages.length === 0) languages = ['en']

  const content = values.content ? { ...values.content } : {}
  for (const code of SUPPORTED_LANGUAGE_CODES) {
    if (!languages.includes(code)) delete (content as Record<string, unknown>)[code]
  }

  const defaultLanguage =
    values.defaultLanguage && languages.includes(values.defaultLanguage)
      ? values.defaultLanguage
      : languages[0]

  const showLanguageSelector =
    languages.length > 1 ? (values.showLanguageSelector ?? false) : false

  return { ...values, languages, content, defaultLanguage, showLanguageSelector }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/normalize-languages.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validation/normalize-languages.ts tests/unit/normalize-languages.test.ts
git commit -m "feat(config): explicit-selection language normalizer"
```

---

### Task 6: ConfigForm UI + caller pages

**Files:**
- Modify: `components/client/ConfigForm.tsx`
- Modify: `app/(client)/app/bots/[botId]/configure/page.tsx:38`
- Modify: `app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/page.tsx:45`
- Modify: `app/(owner)/owner/chatbot/page.tsx:20`
- Modify: `lib/entitlements.ts` (remove now-unused `allLanguages`)
- Modify: `tests/unit/entitlements.test.ts` (drop `allLanguages` assertions)

**Interfaces:**
- Consumes: `normalizeLanguageSelection` (Task 5), `SUPPORTED_LANGUAGES`/`languageMeta` (Task 1), `Entitlements.maxLanguages` (Task 2).
- Produces: `ConfigForm` prop `maxLanguages: number` (replaces `canUseAllLanguages: boolean`).

This is a UI integration task; verify with typecheck, lint, and manual checks rather than a component test.

- [ ] **Step 1: Swap the prop and the resolver transform**

In `components/client/ConfigForm.tsx`:

Add imports:

```ts
import { normalizeLanguageSelection } from '@/lib/validation/normalize-languages'
import { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES, languageMeta } from '@/lib/i18n/languages'
```

Delete the local `withEnabledLanguagesOnly` function (currently ~lines 107-119) and the `LANG_LABELS` const (~lines 152-155). Replace remaining `LANG_LABELS[x]` uses with `languageMeta(x).label`.

In `ConfigFormProps` (line ~80), replace:

```ts
  canUseAllLanguages?: boolean
```

with:

```ts
  /** Plan's max visitor languages (1 = free/single-language). */
  maxLanguages?: number
```

In the destructured params (line ~205), replace `canUseAllLanguages = true,` with `maxLanguages = Infinity,` and add near the top of the component body:

```ts
  const canUseMultiple = maxLanguages > 1
```

Update the RHF resolver (line ~274) from `withEnabledLanguagesOnly(values)` to `normalizeLanguageSelection(values)`.

- [ ] **Step 2: Replace the ltFilled-derived state**

Still in `ConfigForm.tsx`, the current derived state assumes `ltFilled`. Replace the selection source and the two effects:

- Replace `const ltFilled = Boolean(watch('content.lt.greeting')?.trim())` with a watched selection:

```ts
  const selectedLanguages = (watch('languages') ?? ['en']) as BotLanguage[]
```

- Replace the "never leave the tab on LT" effect (lines ~307-312) with one that keeps `activeLang` within the selection:

```ts
  useEffect(() => {
    if (!selectedLanguages.includes(activeLang)) selectLang(selectedLanguages[0] ?? 'en')
  }, [selectedLanguages, activeLang, selectLang])
```

- Replace the `defaultLanguage` effect (lines ~317-323) with:

```ts
  const watchedDefaultLanguage = watch('defaultLanguage')
  useEffect(() => {
    if (!watchedDefaultLanguage || !selectedLanguages.includes(watchedDefaultLanguage)) {
      setValue('defaultLanguage', selectedLanguages[0] ?? 'en', { shouldDirty: false })
    }
  }, [watchedDefaultLanguage, selectedLanguages, setValue])
```

- [ ] **Step 3: Add an "Available languages" toggle helper**

Add this callback in the component body (near `openLtTab`, which you can keep — it still seeds LT content when LT becomes selected):

```ts
  // Toggle a language in/out of the selection. On free (single) plans, selecting
  // replaces the current choice; on paid plans it adds/removes (min one).
  const toggleLanguage = useCallback(
    (lang: BotLanguage) => {
      const current = (watch('languages') ?? ['en']) as BotLanguage[]
      let next: BotLanguage[]
      if (!canUseMultiple) {
        next = [lang]
      } else if (current.includes(lang)) {
        next = current.filter((l) => l !== lang)
        if (next.length === 0) next = [lang] // never empty
      } else {
        next = [...current, lang]
      }
      setValue('languages', next, { shouldDirty: true })
      // Seed content for a newly-selected language so validation passes.
      if (next.includes('lt') && !current.includes('lt')) openLtTab()
      if (!next.includes(activeLang)) selectLang(next[0])
    },
    [watch, setValue, canUseMultiple, openLtTab, activeLang, selectLang],
  )
```

- [ ] **Step 4: Replace the language segmented control + gating block**

Replace the segmented-control block and its upgrade hint (lines ~619-657) with an Available-languages selector followed by the content tabs. Insert this before the "Primary language" block:

```tsx
            {/* Available languages — which languages visitors can use. */}
            <div className="space-y-2">
              <Label>Available languages</Label>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGUAGES.map((l) => {
                  const on = selectedLanguages.includes(l.code)
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => toggleLanguage(l.code)}
                      aria-pressed={on}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                        on
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-input text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span>{l.flag}</span>
                      {l.label}
                    </button>
                  )
                })}
              </div>
              {!canUseMultiple && (
                <p className="text-xs text-muted-foreground">
                  Your plan includes one language. Pick the one you want —{' '}
                  <a href="/app/subscription" className="text-primary hover:underline">
                    upgrade to offer more
                  </a>
                  .
                </p>
              )}
            </div>

            {/* Content-language tabs — one per selected language. */}
            <div className="flex items-center gap-3 rounded-lg bg-muted p-1 w-fit">
              {selectedLanguages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => selectLang(lang)}
                  className={cn(
                    'px-4 py-1 text-sm font-medium rounded-md transition-all',
                    activeLang === lang
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  aria-pressed={activeLang === lang}
                >
                  {languageMeta(lang).label}
                </button>
              ))}
            </div>
```

- [ ] **Step 5: Always show Primary + switcher; lock on free**

Replace the `{canUseAllLanguages && ltFilled && ( … )}` wrapper (lines ~661-710) so the block always renders, the Primary select is limited to selected languages and disabled when single, and the switcher is disabled unless 2+ languages are selected:

```tsx
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Primary language</Label>
                <Controller
                  name="defaultLanguage"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? selectedLanguages[0] ?? 'en'}
                      onValueChange={field.onChange}
                      disabled={selectedLanguages.length < 2}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedLanguages.map((l) => (
                          <SelectItem key={l} value={l}>
                            {languageMeta(l).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The language the widget opens in for visitors.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Controller
                  name="showLanguageSelector"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={(field.value ?? false) && selectedLanguages.length > 1}
                      onCheckedChange={field.onChange}
                      id="showLanguageSelector"
                      size="sm"
                      disabled={selectedLanguages.length < 2}
                    />
                  )}
                />
                <Label htmlFor="showLanguageSelector" className="text-sm font-normal cursor-pointer">
                  Let visitors switch language
                </Label>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground">
                {selectedLanguages.length < 2
                  ? 'Add a second language to let visitors switch.'
                  : 'Shows a flag button in the widget header. Off = the widget stays in the primary language.'}
              </p>
            </div>
```

- [ ] **Step 6: Update the live-preview language list**

The preview object (lines ~475-477) derives `languages`/`defaultLanguage`/`showLanguageSelector`. Replace the `ltFilled`-based `languages` line:

```ts
      languages: (ltFilled ? ['en', 'lt'] : ['en']) as BotLanguage[],
```

with:

```ts
      languages: selectedLanguages,
```

- [ ] **Step 7: Update the caller pages**

In each of these, replace the `canUseAllLanguages={…}` prop with `maxLanguages`:

- `app/(client)/app/bots/[botId]/configure/page.tsx:38` — `canUseAllLanguages={ent.allLanguages}` → `maxLanguages={ent.maxLanguages}`
- `app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/page.tsx:45` — `canUseAllLanguages={ent.allLanguages}` → `maxLanguages={ent.maxLanguages}`
- `app/(owner)/owner/chatbot/page.tsx:20` — `canUseAllLanguages` → `maxLanguages={Infinity}`

- [ ] **Step 8: Remove the now-unused `allLanguages`**

Confirm nothing else reads it:

Run: `grep -rn "allLanguages" lib app components tests | grep -v node_modules | grep -v "\.next"`
Expected: only `lib/entitlements.ts` and `tests/unit/entitlements.test.ts`.

Remove the `allLanguages` line from the `Entitlements` interface and from every plan in `lib/entitlements.ts`. Remove the `expect(e.allLanguages)...` lines from `tests/unit/entitlements.test.ts`.

- [ ] **Step 9: Typecheck, lint, full test run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint components/client/ConfigForm.tsx lib/entitlements.ts "app/(client)/app/bots/[botId]/configure/page.tsx" "app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/page.tsx" "app/(owner)/owner/chatbot/page.tsx"`
Expected: no errors.
Run: `npm test -- tests/unit/entitlements.test.ts tests/unit/widget-config.test.ts tests/unit/botConfig.test.ts tests/unit/normalize-languages.test.ts tests/unit/languages.test.ts`
Expected: all PASS.

- [ ] **Step 10: Manual verification**

Start the app (`npm run dev`) and open a bot's configure screen:
- **Paid bot:** both languages selectable as chips; picking both shows two content tabs; Primary dropdown lists both; the switch toggle is enabled. In the widget preview, enabling the switch + 2 languages shows the flag switcher.
- **Free bot** (or pass `maxLanguages={1}`): selecting a language replaces the choice (only one active chip); Primary dropdown is locked to it; switch toggle is disabled with the "add a second language" hint. Choosing Lithuanian only makes the widget open in Lithuanian.

- [ ] **Step 11: Commit**

```bash
git add components/client/ConfigForm.tsx "app/(client)/app/bots/[botId]/configure/page.tsx" "app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/page.tsx" "app/(owner)/owner/chatbot/page.tsx" lib/entitlements.ts tests/unit/entitlements.test.ts
git commit -m "feat(config): explicit available-languages selection + free-tier single language"
```

---

## Self-Review Notes

- **Spec coverage:** registry (§1 → Task 1), entitlement (§2 → Tasks 2/6), schema de-anchor (§3 → Task 4), widget-config clamp (§4 → Task 3), ConfigForm UI + free-tier lock (§5 → Tasks 5/6). All covered.
- **Behavior change flagged:** the existing free-plan widget-config test is intentionally rewritten in Task 3 (English-forced → primary-clamped).
- **Green between tasks:** `allLanguages` is kept through Tasks 2–5 and removed only in Task 6 Step 8, after its last reader (the caller pages) is updated in Step 7.
