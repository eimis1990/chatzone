import { describe, it, expect } from 'vitest'
import {
  agentConfigHash,
  buildAgentConfig,
  buildDisplayToolConfig,
  buildSearchToolConfig,
} from '@/lib/ai/elevenlabs-agent'
import { DEFAULT_VOICE_LLM, isValidVoiceLlm } from '@/lib/ai/voice-models'
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
    last_seen_at: null,
    show_on_landing: false,
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
    expect(cfg.conversation_config.agent.first_message).toBe(bot.config.content.en!.greeting)
    expect(cfg.conversation_config.agent.language).toBe('en')
    // Defaults to the strong voice LLM when no llmModel is set.
    expect(DEFAULT_VOICE_LLM).toBe('gpt-4o')
    expect(isValidVoiceLlm(DEFAULT_VOICE_LLM)).toBe(true)
    expect(cfg.conversation_config.agent.prompt.llm).toBe(DEFAULT_VOICE_LLM)
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

  it('requires candidate review before voice product cards are displayed', () => {
    const cfg = buildAgentConfig(makeBot(), ['search-tool', 'display-tool'])
    const prompt = cfg.conversation_config.agent.prompt.prompt

    expect(prompt).toContain('search returns CANDIDATES but shows nothing yet')
    expect(prompt).toContain('call `display_products` exactly once')
    expect(prompt).toContain('2 m by 1.8 m → 200 cm 180 cm')
    expect(prompt).toContain('write every number as digits')
  })

  it('adds only the selected provider guidance to the voice product tools', () => {
    const base = defaultBotConfig('Bot')
    const verskis = {
      ...base,
      commerce: {
        enabled: true,
        provider: 'verskis' as const,
        storeUrl: 'https://furniture.example',
        discount: { enabled: false },
      },
    }

    const search = buildSearchToolConfig(verskis)
    const display = buildDisplayToolConfig(verskis)
    expect(search.description).toContain("catalog's canonical form")
    expect(display.description).toContain('exactly min(20')
    expect(display.parameters.properties.productIdsJson.type).toBe('string')
    expect(display.parameters.required).toEqual(['productIdsJson'])

    const neutralSearch = buildSearchToolConfig(base)
    const neutralDisplay = buildDisplayToolConfig(base)
    expect(neutralSearch.description).not.toContain("catalog's canonical form")
    expect(neutralDisplay.description).not.toContain('exactly min(20')
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

  it('changes when the commerce provider changes because voice guidance is provider-specific', () => {
    const base = defaultBotConfig('Bot')
    const a = makeBot({
      ...base,
      commerce: { ...base.commerce, enabled: true, provider: 'woocommerce', storeUrl: 'https://store.example' },
    })
    const b = makeBot({
      ...base,
      commerce: { ...base.commerce, enabled: true, provider: 'verskis', storeUrl: 'https://store.example' },
    })
    expect(agentConfigHash(a)).not.toBe(agentConfigHash(b))
  })
})
