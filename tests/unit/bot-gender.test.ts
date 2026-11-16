import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '@/lib/ai/prompt'
import { botGenderInstruction } from '@/lib/ai/bot-identity'
import { botConfigSchema, defaultBotConfig } from '@/lib/validation/schemas'
import { buildAgentConfig, agentConfigHash } from '@/lib/ai/elevenlabs-agent'
import type { Bot } from '@/lib/types'

const base = defaultBotConfig('Natali')
describe('bot grammatical gender', () => {
  it('keeps legacy configs unchanged and validates saved gender choices', () => {
    expect(botConfigSchema.parse(base).gender).toBeUndefined()
    expect(botGenderInstruction(base)).toBe('')
    for (const gender of ['female', 'male', 'neutral']) {
      expect(botConfigSchema.parse({ ...base, gender }).gender).toBe(gender)
    }
    expect(botConfigSchema.safeParse({ ...base, gender: 'anything' }).success).toBe(false)
  })

  it.each(['female', 'male', 'neutral'] as const)('passes %s identity to text and voice and invalidates voice cache', (gender) => {
    const config = { ...base, gender }
    const instruction = botGenderInstruction(config)
    expect(buildSystemPrompt(config, [], 'lt')).toContain(instruction)
    const bot = { id: 'bot', public_key: 'key', config } as Bot
    expect(buildAgentConfig(bot).conversation_config.agent.prompt.prompt).toContain(instruction)
    expect(agentConfigHash(bot)).not.toBe(agentConfigHash({ ...bot, config: base }))
  })

  it('gives explicit Lithuanian feminine examples and overrides older wording', () => {
    const prompt = buildSystemPrompt({ ...base, gender: 'female' }, [], 'lt')
    expect(prompt).toContain('say “galėdama”')
    expect(prompt).toContain('takes precedence over conflicting persona examples or earlier assistant wording')
    expect(prompt).toContain('never infer the visitor’s gender')
  })
})
