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
  it('maps the bot config to a v3 conversational agent with a built-in LLM', () => {
    const bot = makeBot()
    const cfg = buildAgentConfig(bot)
    expect(cfg.conversation_config.agent.first_message).toBe(bot.config.content.en.greeting)
    expect(cfg.conversation_config.agent.language).toBe('en')
    // Defaults to gpt-4o-mini when no llmModel is set.
    expect(cfg.conversation_config.agent.prompt.llm).toBe('gpt-4o-mini')
    expect(cfg.conversation_config.tts.model_id).toBe('eleven_v3_conversational')
    expect(cfg.conversation_config.tts.expressive_mode).toBe(true)
    expect(cfg.conversation_config.tts.voice_id).toBe(bot.config.voice.voices.en)
  })

  it('uses the configured built-in LLM model', () => {
    const base = defaultBotConfig('Bot')
    const bot = makeBot({ ...base, voice: { ...base.voice, llmModel: 'gemini-2.5-flash' } })
    expect(buildAgentConfig(bot).conversation_config.agent.prompt.llm).toBe('gemini-2.5-flash')
  })

  it('English-only bot has no language presets or supported voices', () => {
    const cfg = buildAgentConfig(makeBot())
    expect(Object.keys(cfg.conversation_config.language_presets)).toEqual([])
    expect(cfg.conversation_config.tts.supported_voices).toEqual([])
  })

  it('bilingual bot adds an lt language preset + lt supported voice', () => {
    const cfg = buildAgentConfig(makeBot(bilingual()))
    expect(cfg.conversation_config.agent.language).toBe('en')
    expect(cfg.conversation_config.language_presets.lt.overrides.agent.first_message).toBe('Sveiki')
    const lt = cfg.conversation_config.tts.supported_voices.find((v) => v.language === 'lt')
    expect(lt?.voice_id).toBe('voice-lt')
  })
})

describe('agentConfigHash', () => {
  it('is stable for identical inputs', () => {
    const bot = makeBot()
    expect(agentConfigHash(bot)).toBe(agentConfigHash(bot))
  })

  it('changes when a voice changes', () => {
    const a = makeBot()
    const b = makeBot(bilingual())
    expect(agentConfigHash(a)).not.toBe(agentConfigHash(b))
  })

  it('changes when the voice LLM model changes', () => {
    const base = defaultBotConfig('Bot')
    const a = makeBot({ ...base, voice: { ...base.voice, llmModel: 'gpt-4o-mini' } })
    const b = makeBot({ ...base, voice: { ...base.voice, llmModel: 'gemini-2.5-flash' } })
    expect(agentConfigHash(a)).not.toBe(agentConfigHash(b))
  })
})
