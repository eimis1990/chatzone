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
