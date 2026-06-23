import { describe, it, expect } from 'vitest'
import { botConfigSchema, defaultBotConfig } from '@/lib/validation/schemas'

describe('defaultBotConfig', () => {
  it('produces a config that satisfies the schema', () => {
    const cfg = defaultBotConfig('Acme Assistant')
    expect(() => botConfigSchema.parse(cfg)).not.toThrow()
    expect(cfg.displayName).toBe('Acme Assistant')
    expect(cfg.model).toBe('gpt-4o-mini')
  })
})

describe('botConfigSchema', () => {
  it('applies defaults for omitted optional fields', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'Bot',
      greeting: 'Hi',
      systemPrompt: 'You are helpful.',
    })
    expect(parsed.model).toBe('gpt-4o-mini')
    expect(parsed.temperature).toBe(0.3)
    expect(parsed.theme.position).toBe('bottom-right')
    expect(parsed.theme.cornerRadius).toBe(16)
    expect(parsed.theme.bubbleRadius).toBe(16)
    expect(parsed.leadCapture.enabled).toBe(false)
    expect(parsed.allowedDomains).toEqual([])
  })

  it('caps suggested questions at 6', () => {
    expect(() =>
      botConfigSchema.parse({
        displayName: 'B',
        greeting: 'h',
        systemPrompt: 's',
        suggestedQuestions: ['1', '2', '3', '4', '5', '6', '7'],
      }),
    ).toThrow()
  })

  it('applies voice defaults (off by default)', () => {
    const parsed = botConfigSchema.parse({ displayName: 'Bot', greeting: 'Hi', systemPrompt: 's' })
    expect(parsed.voice.enabled).toBe(false)
    expect(parsed.voice.ttsEnabled).toBe(true)
    expect(parsed.voice.sttEnabled).toBe(true)
    expect(parsed.voice.voices.en).toBeTruthy()
  })

  it('normalizes a legacy (flat) config into per-language content', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'Bot',
      greeting: 'Legacy hi',
      suggestedQuestions: ['q1'],
      fallbackMessage: 'no idea',
      systemPrompt: 's',
      voice: { voiceId: 'v123' },
    })
    expect(parsed.languages).toEqual(['en'])
    expect(parsed.content.en.greeting).toBe('Legacy hi')
    expect(parsed.content.en.suggestedQuestions).toEqual(['q1'])
    expect(parsed.voice.voices.en).toBe('v123')
  })

  it('requires content for every enabled language', () => {
    expect(() =>
      botConfigSchema.parse({
        displayName: 'Bot',
        systemPrompt: 's',
        languages: ['en', 'lt'],
        content: { en: { greeting: 'Hi', suggestedQuestions: [], fallbackMessage: 'x' } },
      }),
    ).toThrow()
  })

  it('accepts a bilingual config with both contents', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'Bot',
      systemPrompt: 's',
      languages: ['en', 'lt'],
      content: {
        en: { greeting: 'Hi', suggestedQuestions: [], fallbackMessage: 'x' },
        lt: { greeting: 'Sveiki', suggestedQuestions: [], fallbackMessage: 'nezinau' },
      },
    })
    expect(parsed.content.lt?.greeting).toBe('Sveiki')
  })

  it('rejects a temperature above 2', () => {
    expect(() => botConfigSchema.parse({ displayName: 'B', greeting: 'h', systemPrompt: 's', temperature: 3 })).toThrow()
  })

  it('rejects a temperature below 0', () => {
    expect(() => botConfigSchema.parse({ displayName: 'B', greeting: 'h', systemPrompt: 's', temperature: -1 })).toThrow()
  })

  it('rejects an invalid widget position', () => {
    expect(() =>
      botConfigSchema.parse({ displayName: 'B', greeting: 'h', systemPrompt: 's', theme: { primaryColor: '#fff', position: 'top' } }),
    ).toThrow()
  })

  it('accepts a fully-specified lead-capture block', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'B',
      greeting: 'h',
      systemPrompt: 's',
      leadCapture: {
        enabled: true,
        trigger: 'on_fallback',
        fields: [{ key: 'email', label: 'Email', required: true }],
      },
    })
    expect(parsed.leadCapture.fields[0].key).toBe('email')
  })
})
