import { describe, expect, it } from 'vitest'
import { messageTemplates, seedMessageTemplates } from '@/lib/i18n/message-templates'
import { botConfigSchema, defaultBotConfig } from '@/lib/validation/schemas'
import { normalizeLanguageSelection } from '@/lib/validation/normalize-languages'

describe('language message templates', () => {
  it.each(['en', 'lt'] as const)('prepares a valid %s-only bot from missing content', (language) => {
    const config = normalizeLanguageSelection({
      ...defaultBotConfig('Assistant'),
      languages: [language],
      content: { [language]: seedMessageTemplates(language, undefined, 'Assistant') },
    })
    const parsed = botConfigSchema.parse(config)
    expect(parsed.defaultLanguage).toBe(language)
    expect(parsed.content[language]?.greeting).toContain('👋')
    expect(parsed.content[language]?.fallbackMessage).toContain('🤔')
    expect(parsed.content[language]?.suggestedQuestions).toEqual([])
  })

  it('fills a partially mounted Lithuanian content object and preserves quick actions', () => {
    const content = { greeting: '  ', fallbackMessage: '', suggestedQuestions: [{ label: 'Kontaktai' }] }
    const seeded = seedMessageTemplates('lt', content)
    expect(seeded.greeting).toBe(messageTemplates('lt').greeting)
    expect(seeded.fallbackMessage).toBe(messageTemplates('lt').fallbackMessage)
    expect(seeded.suggestedQuestions).toEqual(content.suggestedQuestions)
    expect(content.greeting).toBe('  ')
  })

  it('preserves both custom messages, including their formatting', () => {
    const content = { greeting: 'Sveiki, draugai!\n', fallbackMessage: 'Parašykite mums.' }
    expect(seedMessageTemplates('lt', content, 'Assistant')).toEqual(content)
  })

  it('fills only the missing message', () => {
    const seeded = seedMessageTemplates('en', { greeting: 'Welcome back!' })
    expect(seeded.greeting).toBe('Welcome back!')
    expect(seeded.fallbackMessage).toBe(messageTemplates('en').fallbackMessage)
  })

  it('uses emoji templates for newly created bots', () => {
    expect(defaultBotConfig('Helper').content.en).toMatchObject(messageTemplates('en', 'Helper'))
  })
})
