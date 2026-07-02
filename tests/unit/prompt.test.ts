import { describe, it, expect } from 'vitest'
import { buildMessages, HISTORY_WINDOW } from '@/lib/ai/prompt'
import { defaultBotConfig } from '@/lib/validation/schemas'

const config = defaultBotConfig('Helper')

describe('buildMessages', () => {
  it('starts with a system message containing the bot system prompt', () => {
    const msgs = buildMessages(config, [], [], 'hello')
    expect(msgs[0].role).toBe('system')
    expect(msgs[0].content).toContain(config.systemPrompt)
  })

  it('embeds retrieved context with source tags', () => {
    const msgs = buildMessages(
      config,
      [{ content: 'We are open 9-5.', source_id: 'src-1' }],
      [],
      'hours?',
    )
    expect(msgs[0].content).toContain('We are open 9-5.')
    expect(msgs[0].content).toContain('src-1')
  })

  it('appends history then the user message last', () => {
    const history = [
      { role: 'user' as const, content: 'hi' },
      { role: 'assistant' as const, content: 'hello!' },
    ]
    const msgs = buildMessages(config, [], history, 'next question')
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: 'next question' })
    expect(msgs.some((m) => m.content === 'hello!')).toBe(true)
  })

  it('bounds history to the sliding window', () => {
    const history = Array.from({ length: HISTORY_WINDOW + 10 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `m${i}`,
    }))
    const msgs = buildMessages(config, [], history, 'q')
    // system + up to HISTORY_WINDOW history + final user
    expect(msgs.length).toBeLessThanOrEqual(1 + HISTORY_WINDOW + 1)
    expect(msgs.some((m) => m.content === 'm0')).toBe(false)
  })

  it('instructs to use the fallback when no context is available', () => {
    const msgs = buildMessages(config, [], [], 'q')
    expect(msgs[0].content.toLowerCase()).toContain('not')
  })

  it('instructs English by default', () => {
    const msgs = buildMessages(config, [], [], 'q')
    expect(msgs[0].content).toContain('respond in English')
  })

  it('instructs Lithuanian when lang is lt', () => {
    const msgs = buildMessages(config, [], [], 'q', 'lt')
    expect(msgs[0].content).toContain('respond in Lithuanian')
  })

  it('no longer asks the model to print source ids', () => {
    const msgs = buildMessages(config, [{ content: 'x', source_id: 's1' }], [], 'q')
    expect(msgs[0].content).not.toMatch(/cite the sources/i)
    expect(msgs[0].content).toMatch(/do not (mention|print|reference)/i)
  })

  it('adds the rich-formatting instruction when richResponses is on (default)', () => {
    const msgs = buildMessages(config, [], [], 'q')
    expect(msgs[0].content).toContain('FORMATTING:')
  })

  it('omits the rich-formatting instruction when richResponses is off', () => {
    const msgs = buildMessages({ ...config, richResponses: false }, [], [], 'q')
    expect(msgs[0].content).not.toContain('FORMATTING:')
  })

  it('allows natural descriptive product queries (hybrid search handles them)', () => {
    const commerceConfig = {
      ...config,
      commerce: { ...config.commerce, enabled: true, provider: 'woocommerce' as const, storeUrl: 'https://x.lt' },
    }
    const msgs = buildMessages(commerceConfig, [], [], 'q')
    expect(msgs[0].content).toContain('PRODUCT SEARCH')
    expect(msgs[0].content).not.toContain('no adjectives')
    expect(msgs[0].content).toContain('descriptive')
  })
})
