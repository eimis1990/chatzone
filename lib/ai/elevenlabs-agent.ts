import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot, BotLanguage } from '@/lib/types'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { LLM_TOKEN_SETTING } from '@/lib/ai/llm-auth'
import { isValidVoiceLlm, DEFAULT_VOICE_LLM } from '@/lib/ai/voice-models'

// Re-export the Edge-safe token reader so existing voice-token route imports
// (`from '@/lib/ai/elevenlabs-agent'`) keep working.
export { getLlmToken } from '@/lib/ai/llm-auth'

const API = 'https://api.elevenlabs.io/v1'
const SETTING_TOKEN = LLM_TOKEN_SETTING

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
        // Standalone tools (created via /v1/convai/tools) the agent may call.
        tool_ids: string[]
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
export function buildAgentConfig(bot: Bot, toolIds: string[] = []): AgentConfig {
  const cfg = bot.config
  // Guard: an unknown/invalid id makes the agent API reject the whole config, so
  // fall back to the default rather than break voice for the bot.
  const llm = isValidVoiceLlm(cfg.voice?.llmModel) ? cfg.voice!.llmModel! : DEFAULT_VOICE_LLM
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
          prompt: toolIds.length
            ? `${cfg.systemPrompt}\n\nWhen the user asks about products, prices, availability, recommendations, or store information, call the \`search\` tool. Use a SHORT query of the product type or topic.${
                languages.includes('lt')
                  ? " This store's catalog is often Lithuanian, so translate the term (e.g. \"veido kremas\" for face cream, \"serumas\" for serum)."
                  : ''
              } If a search returns nothing, try a simpler or translated term before saying it's unavailable. Answer briefly and naturally from the results — don't read out long lists or links.`
            : cfg.systemPrompt,
          llm,
          custom_llm: null,
          tool_ids: toolIds,
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
export function agentConfigHash(bot: Bot, toolIds: string[] = []): string {
  const cfg = bot.config
  const material = JSON.stringify([
    'v5-tools', // bump to force re-sync when the agent payload shape changes
    cfg.languages,
    cfg.content,
    cfg.voice?.voices,
    cfg.voice?.llmModel ?? 'gpt-4o-mini',
    cfg.systemPrompt,
    bot.public_key,
    toolIds,
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

/** Get-or-create the shared bearer token our agent tool webhook verifies. */
async function ensureSharedToken(db: SupabaseClient): Promise<string> {
  let token = await getSetting(db, SETTING_TOKEN)
  if (!token) {
    token = randomBytes(24).toString('hex')
    await setSetting(db, SETTING_TOKEN, token)
  }
  return token
}

/** Webhook tool config: lets the agent search the bot's products + knowledge. */
function buildSearchToolConfig(bot: Bot, appUrl: string, token: string) {
  return {
    type: 'webhook' as const,
    name: 'search',
    description:
      "Search this store's live product catalog and knowledge base. Call it whenever the user " +
      'asks about products, prices, availability, recommendations, or any store information. ' +
      'Pass a concise query (the product type or topic).',
    response_timeout_secs: 20,
    api_schema: {
      url: `${appUrl}/api/agent-tools/${bot.public_key}`,
      method: 'POST' as const,
      request_headers: { Authorization: `Bearer ${token}` },
      request_body_schema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string' as const,
            description: 'What to search for, e.g. "face cream" or "opening hours".',
          },
        },
        required: ['query'],
      },
    },
  }
}

/**
 * Ensures the bot's `search` webhook tool exists in the ElevenLabs workspace
 * (creating it once, then PATCHing). Returns its tool id.
 */
async function ensureSearchTool(
  db: SupabaseClient,
  bot: Bot,
  appUrl: string,
  token: string,
): Promise<string> {
  const headers = { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' }
  const body = JSON.stringify({ tool_config: buildSearchToolConfig(bot, appUrl, token) })
  const key = `cbz_tool_${bot.id}`
  const existing = await getSetting(db, key)

  if (existing) {
    const res = await fetch(`${API}/convai/tools/${existing}`, { method: 'PATCH', headers, body })
    if (res.ok) return existing
    if (res.status !== 404) throw new Error(`Failed to update tool: HTTP ${res.status}`)
    // 404 → the tool was deleted; fall through and recreate.
  }

  const res = await fetch(`${API}/convai/tools`, { method: 'POST', headers, body })
  if (!res.ok) throw new Error(`Failed to create tool: HTTP ${res.status}`)
  const data = (await res.json()) as { id: string }
  await setSetting(db, key, data.id)
  return data.id
}

/**
 * Ensures the bot has an up-to-date ElevenLabs agent; creates or PATCHes as
 * needed. Returns the agent_id. Uses the service-role db client.
 */
export async function ensureAgent(db: SupabaseClient, bot: Bot, appUrl: string): Promise<string> {
  const token = await ensureSharedToken(db)
  const toolId = await ensureSearchTool(db, bot, appUrl, token)
  const toolIds = [toolId]

  const hash = agentConfigHash(bot, toolIds)
  if (bot.elevenlabs_agent_id && bot.elevenlabs_agent_hash === hash) {
    return bot.elevenlabs_agent_id
  }

  const config = buildAgentConfig(bot, toolIds)
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
