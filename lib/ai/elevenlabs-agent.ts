import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot, BotLanguage } from '@/lib/types'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { LLM_TOKEN_SETTING } from '@/lib/ai/llm-auth'

// Re-export the Edge-safe token reader so existing voice-token route imports
// (`from '@/lib/ai/elevenlabs-agent'`) keep working.
export { getLlmToken } from '@/lib/ai/llm-auth'

const API = 'https://api.elevenlabs.io/v1'
const SETTING_TOKEN = LLM_TOKEN_SETTING
const SETTING_SECRET_ID = 'elevenlabs_llm_secret_id'

// ElevenLabs "V3 Conversational" — the only model family that supports the full
// language set (incl. Lithuanian) for real-time agents.
const AGENT_TTS_MODEL = 'eleven_v3_conversational'
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

interface SupportedVoice {
  label: string
  voice_id: string
  language: string
  description: string
}

export interface AgentConfig {
  name: string
  conversation_config: {
    agent: {
      first_message: string
      language: string
      prompt: {
        prompt: string
        // Built-in ElevenLabs LLM id (e.g. gpt-4o-mini, gemini-2.5-flash).
        llm: string
        // Must be null for built-in LLMs. Sending null also CLEARS any stale
        // custom_llm on a PATCH (ElevenLabs merges; it rejects llm≠CUSTOM_LLM
        // while a custom_llm object is still present).
        custom_llm: null
      }
    }
    tts: {
      voice_id: string
      model_id: string
      expressive_mode: boolean
      supported_voices: SupportedVoice[]
    }
    language_presets: Record<string, { overrides: { agent: { first_message: string } } }>
  }
  // Allow the client SDK to set the conversation language at session start
  // (so a visitor who picked Lithuanian starts the call in Lithuanian).
  platform_settings: {
    overrides: {
      conversation_config_override: {
        agent: { language: boolean }
      }
    }
  }
}

const LANG_NAME: Record<string, string> = { en: 'English', lt: 'Lithuanian' }

/**
 * Maps a bot to a single multilingual ElevenLabs agent: V3 Conversational with
 * a default language + `language_presets` (per-language first message) and
 * `supported_voices` (per-language voice override).
 */
export function buildAgentConfig(bot: Bot): AgentConfig {
  const cfg = bot.config
  const llm = cfg.voice?.llmModel || 'gpt-4o-mini'
  const languages: BotLanguage[] = cfg.languages?.length ? cfg.languages : ['en']
  const defaultLang = languages[0]
  const enContent = cfg.content?.en
  const defaultContent = cfg.content?.[defaultLang] ?? enContent
  const voices = cfg.voice?.voices ?? { en: DEFAULT_VOICE_ID }
  const defaultVoice = voices[defaultLang] ?? voices.en ?? DEFAULT_VOICE_ID

  const supportedVoices: SupportedVoice[] = []
  const languagePresets: AgentConfig['conversation_config']['language_presets'] = {}
  for (const lang of languages) {
    if (lang === defaultLang) continue
    const content = cfg.content?.[lang]
    languagePresets[lang] = {
      overrides: { agent: { first_message: content?.greeting ?? defaultContent?.greeting ?? '' } },
    }
    supportedVoices.push({
      label: LANG_NAME[lang] ?? lang,
      voice_id: voices[lang] ?? defaultVoice,
      language: lang,
      description: `Use this when speaking ${LANG_NAME[lang] ?? lang}`,
    })
  }

  return {
    name: `cbz-${bot.id}`,
    conversation_config: {
      agent: {
        first_message: defaultContent?.greeting ?? '',
        language: defaultLang,
        prompt: {
          prompt: cfg.systemPrompt,
          llm,
          custom_llm: null,
        },
      },
      tts: {
        voice_id: defaultVoice,
        model_id: AGENT_TTS_MODEL,
        expressive_mode: true,
        supported_voices: supportedVoices,
      },
      language_presets: languagePresets,
    },
    platform_settings: {
      overrides: { conversation_config_override: { agent: { language: true } } },
    },
  }
}

/** Stable hash of the bot fields that require re-syncing the agent when changed. */
export function agentConfigHash(bot: Bot): string {
  const cfg = bot.config
  const material = JSON.stringify([
    'v3-builtin-llm', // bump to force re-sync when the agent payload shape changes
    cfg.languages,
    cfg.content,
    cfg.voice?.voices,
    cfg.voice?.llmModel ?? 'gpt-4o-mini',
    cfg.systemPrompt,
    bot.public_key,
  ])
  return createHash('sha256').update(material).digest('hex').slice(0, 32)
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) throw new MissingVoiceKeyError()
  return key
}

async function getSetting(db: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await db.from('platform_settings').select('value').eq('key', key).single()
  return (data?.value as string) ?? null
}

async function setSetting(db: SupabaseClient, key: string, value: string): Promise<void> {
  await db.from('platform_settings').upsert({ key, value, updated_at: new Date().toISOString() })
}

/**
 * Ensures a shared token (for our custom-LLM endpoint) and a matching ElevenLabs
 * workspace secret exist. Returns the token and the secret_id agents reference.
 */
export async function ensureLlmAuth(
  db: SupabaseClient,
): Promise<{ token: string; secretId: string }> {
  let token = await getSetting(db, SETTING_TOKEN)
  if (!token) {
    token = randomBytes(24).toString('hex')
    await setSetting(db, SETTING_TOKEN, token)
  }
  let secretId = await getSetting(db, SETTING_SECRET_ID)
  if (!secretId) {
    const res = await fetch(`${API}/convai/secrets`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'new', name: 'CBZ_LLM_TOKEN', value: token }),
    })
    if (!res.ok) throw new Error(`Failed to create ElevenLabs secret: HTTP ${res.status}`)
    const data = (await res.json()) as { secret_id?: string; id?: string }
    secretId = data.secret_id ?? data.id ?? ''
    if (!secretId) throw new Error('ElevenLabs secret response missing id')
    await setSetting(db, SETTING_SECRET_ID, secretId)
  }
  return { token, secretId }
}

/**
 * Ensures the bot has an up-to-date ElevenLabs agent; creates or PATCHes as
 * needed. Returns the agent_id. Uses the service-role db client.
 */
export async function ensureAgent(db: SupabaseClient, bot: Bot): Promise<string> {
  const hash = agentConfigHash(bot)
  if (bot.elevenlabs_agent_id && bot.elevenlabs_agent_hash === hash) {
    return bot.elevenlabs_agent_id
  }

  const config = buildAgentConfig(bot)
  const headers = { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' }

  const createAgent = async (): Promise<string> => {
    const res = await fetch(`${API}/convai/agents/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error(`Failed to create agent: HTTP ${res.status}`)
    const data = (await res.json()) as { agent_id: string }
    return data.agent_id
  }

  let agentId = bot.elevenlabs_agent_id ?? ''
  if (!agentId) {
    agentId = await createAgent()
  } else {
    const res = await fetch(`${API}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(config),
    })
    if (!res.ok) {
      // The stored agent was deleted/invalid → recreate instead of failing.
      if (res.status === 404 || res.status === 422) {
        agentId = await createAgent()
      } else {
        throw new Error(`Failed to update agent: HTTP ${res.status}`)
      }
    }
  }

  await db
    .from('bots')
    .update({ elevenlabs_agent_id: agentId, elevenlabs_agent_hash: hash })
    .eq('id', bot.id)
  return agentId
}

/** Mints a short-lived WebRTC conversation token for the client SDK. */
export async function getConversationToken(agentId: string): Promise<string> {
  const res = await fetch(`${API}/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { 'xi-api-key': apiKey() },
  })
  if (!res.ok) throw new Error(`Failed to get conversation token: HTTP ${res.status}`)
  const data = (await res.json()) as { token: string }
  return data.token
}
