import { describe, it, expect } from 'vitest'
import { suggestedQuestionSchema, botConfigSchema } from '@/lib/validation/schemas'
import { publicBotConfig, sqAction, sqLabel, sqMode, sqPrompt, sqUrl } from '@/lib/widget-config'
import {
  QUICK_ACTION_SUGGESTIONS,
  buildQuickAction,
} from '@/lib/quick-action-suggestions'
import type { BotConfig, SuggestedQuestion } from '@/lib/types'

// ---------------------------------------------------------------------------
// Schema round-trip — every quick-action form parses and survives unchanged.
// ---------------------------------------------------------------------------
describe('suggestedQuestionSchema — typed actions', () => {
  const roundTrips: [string, SuggestedQuestion][] = [
    ['legacy string', 'What are your opening hours?'],
    ['label only', { label: 'Opening hours' }],
    ['prompt', { label: 'TOP products', prompt: 'Show me your most popular products', url: '' }],
    ['url', { label: 'Sale', prompt: '', url: 'https://store.example.com/sale' }],
    ['handoff', { label: 'Talk to a human', prompt: '', url: '', action: 'handoff' }],
    ['lead', { label: 'Leave your details', prompt: '', url: '', action: 'lead' }],
  ]

  it.each(roundTrips)('round-trips the %s form', (_name, value) => {
    expect(suggestedQuestionSchema.parse(value)).toEqual(value)
  })

  it('rejects an unknown action value', () => {
    expect(() =>
      suggestedQuestionSchema.parse({ label: 'Call me', action: 'call' }),
    ).toThrow()
  })

  it('accepts typed actions inside a full bot config (backward compatible)', () => {
    const parsed = botConfigSchema.parse({
      displayName: 'Bot',
      systemPrompt: 's',
      languages: ['en'],
      content: {
        en: {
          greeting: 'Hi',
          suggestedQuestions: [
            'legacy string',
            { label: 'Talk to a human', action: 'handoff' },
            { label: 'Leave your details', action: 'lead' },
          ],
          fallbackMessage: 'x',
        },
      },
    })
    expect(parsed.content.en!.suggestedQuestions).toHaveLength(3)
    expect(parsed.content.en!.suggestedQuestions[1]).toMatchObject({ action: 'handoff' })
    expect(parsed.content.en!.suggestedQuestions[2]).toMatchObject({ action: 'lead' })
  })
})

// ---------------------------------------------------------------------------
// sq* helpers — click behavior derivation.
// ---------------------------------------------------------------------------
describe('sqMode / sqAction', () => {
  it('string → message', () => {
    expect(sqMode('hi')).toBe('message')
    expect(sqAction('hi')).toBeUndefined()
  })

  it('action takes precedence over url and prompt', () => {
    const q: SuggestedQuestion = {
      label: 'Human',
      prompt: 'ignored',
      url: 'https://example.com',
      action: 'handoff',
    }
    expect(sqMode(q)).toBe('handoff')
    expect(sqAction(q)).toBe('handoff')
  })

  it('lead action is recognized', () => {
    expect(sqMode({ label: 'Details', action: 'lead' })).toBe('lead')
  })

  it('url beats prompt; prompt beats label', () => {
    expect(sqMode({ label: 'L', prompt: 'p', url: 'https://e.com' })).toBe('url')
    expect(sqMode({ label: 'L', prompt: 'p' })).toBe('prompt')
    expect(sqMode({ label: 'L' })).toBe('message')
  })
})

// ---------------------------------------------------------------------------
// Public serialization — `action` reaches the browser-safe widget config.
// ---------------------------------------------------------------------------
const baseConfig: BotConfig = {
  displayName: 'Bot',
  theme: {
    primaryColor: '#4f46e5',
    position: 'bottom-right',
    cornerRadius: 16,
    bubbleRadius: 16,
  },
  systemPrompt: 'secret',
  persona: { tone: 'friendly', verbosity: 'balanced' },
  model: 'gpt-4.1',
  temperature: 0.5,
  languages: ['en', 'lt'],
  content: {
    en: {
      greeting: 'Hi',
      suggestedQuestions: [
        'legacy',
        { label: 'Talk to a human', prompt: '', url: '', action: 'handoff' },
        { label: 'Leave your details', prompt: '', url: '', action: 'lead' },
        { label: 'Sale', prompt: '', url: 'https://store.example.com/sale' },
      ],
      fallbackMessage: 'x',
    },
    lt: {
      greeting: 'Labas',
      suggestedQuestions: [{ label: 'Kalbėti su žmogumi', action: 'handoff' }],
      fallbackMessage: 'ne',
    },
  },
  leadCapture: { enabled: true, trigger: 'manual', fields: [{ key: 'email', label: 'Email', required: true }] },
  allowedDomains: [],
  commerce: { enabled: false, provider: 'woocommerce', storeUrl: '' },
  voice: { enabled: false, ttsEnabled: true, sttEnabled: true, voices: { en: 'v' } },
}

describe('publicBotConfig — quick-action pass-through', () => {
  it('passes the action field through per language', () => {
    const pub = publicBotConfig(baseConfig)
    expect(pub.content.en?.suggestedQuestions).toEqual(baseConfig.content.en!.suggestedQuestions)
    expect(pub.content.lt?.suggestedQuestions?.[0]).toMatchObject({ action: 'handoff' })
  })
})

// ---------------------------------------------------------------------------
// Suggestion library — every fixture, in every language, is a valid action.
// ---------------------------------------------------------------------------
describe('quick-action suggestions', () => {
  const all = QUICK_ACTION_SUGGESTIONS.flatMap((g) =>
    g.suggestions.map((s) => [g.id, s] as const),
  )

  it('has the expected groups', () => {
    expect(QUICK_ACTION_SUGGESTIONS.map((g) => g.id)).toEqual(['ecommerce', 'service'])
    expect(QUICK_ACTION_SUGGESTIONS[0].suggestions).toHaveLength(4)
    expect(QUICK_ACTION_SUGGESTIONS[1].suggestions).toHaveLength(4)
  })

  it.each(['en', 'lt'] as const)('every suggestion parses in %s', (lang) => {
    for (const [, s] of all) {
      const built = buildQuickAction(s, lang)
      expect(() => suggestedQuestionSchema.parse(built)).not.toThrow()
      expect(sqLabel(built)).toBeTruthy()
    }
  })

  it('typed suggestions carry the action; plain ones carry a prompt', () => {
    for (const [, s] of all) {
      const built = buildQuickAction(s, 'lt')
      if (s.action) {
        expect(sqAction(built)).toBe(s.action)
        expect(built.prompt).toBe('')
      } else {
        expect(sqAction(built)).toBeUndefined()
        expect(sqPrompt(built)).toBe(s.prompt?.lt)
        expect(sqUrl(built)).toBeUndefined()
      }
    }
  })

  it('service group offers handoff and lead actions', () => {
    const service = QUICK_ACTION_SUGGESTIONS.find((g) => g.id === 'service')!
    const actions = service.suggestions.map((s) => s.action)
    expect(actions).toContain('handoff')
    expect(actions).toContain('lead')
  })
})
