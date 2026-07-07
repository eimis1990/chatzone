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
