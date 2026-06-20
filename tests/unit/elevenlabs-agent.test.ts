import { describe, it, expect } from 'vitest'
import { buildAgentConfig, agentConfigHash } from '@/lib/ai/elevenlabs-agent'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot, BotConfig } from '@/lib/types'

function makeBot(config: BotConfig = defaultBotConfig('Bot')): Bot {
  return {
    id: 'bot-1',
    org_id: 'org-1',
    name: 'Bot',
    status: 'active',
    public_key: 'pubkey123',
    config,
    elevenlabs_agent_id: null,
    elevenlabs_agent_hash: null,
    created_at: '',
    updated_at: '',
  }
}

function bilingual(): BotConfig {
  const base = defaultBotConfig('Bot')
  return {
    ...base,
    languages: ['en', 'lt'],
    content: {
      en: { greeting: 'Hello', suggestedQuestions: [], fallbackMessage: 'x' },
      lt: { greeting: 'Sveiki', suggestedQuestions: [], fallbackMessage: 'nezinau' },
    },
    voice: { ...base.voice, voices: { en: 'voice-en', lt: 'voice-lt' } },
  }
}

describe('buildAgentConfig', () => {
  it('maps the bot config to a v3 conversational agent with a custom LLM URL', () => {
    const bot = makeBot()
    const cfg = buildAgentConfig(bot, 'https://app.example.com', 'sec_1')
    expect(cfg.conversation_config.agent.first_message).toBe(bot.config.content.en.greeting)
    expect(cfg.conversation_config.agent.language).toBe('en')
    expect(cfg.conversation_config.agent.prompt.llm).toBe('custom-llm')
    expect(cfg.conversation_config.agent.prompt.custom_llm.url).toBe(
      'https://app.example.com/api/llm/pubkey123',
    )
    expect(cfg.conversation_config.tts.model_id).toBe('eleven_v3_conversational')
    expect(cfg.conversation_config.tts.expressive_mode).toBe(true)
    expect(cfg.conversation_config.tts.voice_id).toBe(bot.config.voice.voices.en)
  })

  it('English-only bot has no language presets or supported voices', () => {
    const cfg = buildAgentConfig(makeBot(), 'https://x', 'sec')
    expect(Object.keys(cfg.conversation_config.language_presets)).toEqual([])
    expect(cfg.conversation_config.tts.supported_voices).toEqual([])
  })

  it('bilingual bot adds an lt language preset + lt supported voice', () => {
    const cfg = buildAgentConfig(makeBot(bilingual()), 'https://x', 'sec')
    expect(cfg.conversation_config.agent.language).toBe('en')
    expect(cfg.conversation_config.language_presets.lt.overrides.agent.first_message).toBe('Sveiki')
    const lt = cfg.conversation_config.tts.supported_voices.find((v) => v.language === 'lt')
    expect(lt?.voice_id).toBe('voice-lt')
  })
})

describe('agentConfigHash', () => {
  it('is stable for identical inputs', () => {
    const bot = makeBot()
    expect(agentConfigHash(bot, 'https://x')).toBe(agentConfigHash(bot, 'https://x'))
  })

  it('changes when a voice changes', () => {
    const a = makeBot()
    const b = makeBot(bilingual())
    expect(agentConfigHash(a, 'https://x')).not.toBe(agentConfigHash(b, 'https://x'))
  })

  it('changes when the deployment URL changes', () => {
    const bot = makeBot()
    expect(agentConfigHash(bot, 'https://a')).not.toBe(agentConfigHash(bot, 'https://b'))
  })
})
