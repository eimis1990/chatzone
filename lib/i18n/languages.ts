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
