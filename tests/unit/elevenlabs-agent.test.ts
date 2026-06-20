import { describe, it, expect } from 'vitest'
import { buildAgentConfig, agentConfigHash } from '@/lib/ai/elevenlabs-agent'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot } from '@/lib/types'

function makeBot(over: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    org_id: 'org-1',
    name: 'Bot',
    status: 'active',
    public_key: 'pubkey123',
    config: defaultBotConfig('Bot'),
    elevenlabs_agent_id: null,
    elevenlabs_agent_hash: null,
    created_at: '',
    updated_at: '',
    ...over,
  } as Bot
}

describe('buildAgentConfig', () => {
  it('maps the bot config to an ElevenLabs agent config with a custom LLM URL', () => {
    const bot = makeBot()
    const cfg = buildAgentConfig(bot, 'https://app.example.com', 'sec_1')
    expect(cfg.conversation_config.agent.first_message).toBe(bot.config.greeting)
    expect(cfg.conversation_config.agent.language).toBe('en')
    expect(cfg.conversation_config.agent.prompt.llm).toBe('custom-llm')
    expect(cfg.conversation_config.agent.prompt.custom_llm.url).toBe(
      'https://app.example.com/api/llm/pubkey123',
    )
    expect(cfg.conversation_config.agent.prompt.custom_llm.api_key.secret_id).toBe('sec_1')
    expect(cfg.conversation_config.tts.voice_id).toBe(bot.config.voice.voiceId)
  })

  it('uses a v2 TTS model for English agents', () => {
    const cfg = buildAgentConfig(makeBot(), 'https://x', 'sec')
    expect(cfg.conversation_config.tts.model_id).toBe('eleven_turbo_v2')
  })

  it('passes the configured language through and uses a multilingual model', () => {
    const bot = makeBot({ config: { ...defaultBotConfig('Bot'), language: 'lt' } })
    const cfg = buildAgentConfig(bot, 'https://x', 'sec')
    expect(cfg.conversation_config.agent.language).toBe('lt')
    expect(cfg.conversation_config.tts.model_id).toBe('eleven_turbo_v2_5')
  })
})

describe('agentConfigHash', () => {
  it('is stable for identical inputs', () => {
    const bot = makeBot()
    expect(agentConfigHash(bot, 'https://x')).toBe(agentConfigHash(bot, 'https://x'))
  })

  it('changes when the voice changes', () => {
    const a = makeBot()
    const b = makeBot({
      config: { ...defaultBotConfig('Bot'), voice: { ...defaultBotConfig('Bot').voice, voiceId: 'other' } },
    })
    expect(agentConfigHash(a, 'https://x')).not.toBe(agentConfigHash(b, 'https://x'))
  })

  it('changes when the language changes', () => {
    const a = makeBot()
    const b = makeBot({ config: { ...defaultBotConfig('Bot'), language: 'lt' } })
    expect(agentConfigHash(a, 'https://x')).not.toBe(agentConfigHash(b, 'https://x'))
  })

  it('changes when the deployment URL changes', () => {
    const bot = makeBot()
    expect(agentConfigHash(bot, 'https://a')).not.toBe(agentConfigHash(bot, 'https://b'))
  })
})
