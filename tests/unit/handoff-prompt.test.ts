import { describe, expect, it } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import type { BotConfig } from '@/lib/types'

function config(showHandoffButton: boolean | undefined): BotConfig {
  return {
    systemPrompt: 'You help shoppers.',
    persona: { tone: 'friendly', verbosity: 'concise' },
    languages: ['en'],
    content: { en: { greeting: '', suggestedQuestions: [], fallbackMessage: 'Not sure.' } },
    theme: showHandoffButton === undefined ? {} : { showHandoffButton },
    commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://x.lt' },
  } as unknown as BotConfig
}

describe('buildSystemPrompt honors the Human handoff toggle', () => {
  it('offers a person when handoff is on (and by default)', () => {
    for (const cfg of [config(true), config(undefined)]) {
      const prompt = buildSystemPrompt(cfg, [])
      expect(prompt).toContain('offer to connect them with a person')
      expect(prompt).not.toContain('HUMAN HANDOFF IS DISABLED')
    }
  })

  it('forbids offering a person when handoff is off', () => {
    const prompt = buildSystemPrompt(config(false), [])
    expect(prompt).toContain('HUMAN HANDOFF IS DISABLED')
    expect(prompt).not.toContain('offer to connect them with a person')
  })
})
