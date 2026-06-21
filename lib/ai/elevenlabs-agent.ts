import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot, BotLanguage } from '@/lib/types'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { isValidVoiceLlm, DEFAULT_VOICE_LLM } from '@/lib/ai/voice-models'

const API = 'https://api.elevenlabs.io/v1'

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
            ? `${cfg.systemPrompt}\n\nWhen the user asks about products, prices, availability, or recommendations, call the \`search_products\` tool. Use a SHORT query — ONLY the product noun${
                languages.includes('lt')
                  ? ' in Lithuanian (e.g. "veido kremas" for face cream, "serumas" for serum)'
                  : ''
              }, with NO adjectives like dry/sensitive/hydrating (they return nothing). The matching products are shown to the user automatically as cards, so reply with just ONE short sentence (e.g. "Štai keletas variantų:" / "Here are a few options:") — do NOT read out the product names, prices, or details. If a search returns nothing, retry once with a broader noun; only say a product is unavailable if that also returns nothing.`
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
    'v6-client-tool', // bump to force re-sync when the agent payload shape changes
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

/**
 * CLIENT tool config: the browser runs the search, renders product cards, and
 * returns a short summary the agent speaks. (Client tools push UI to the page;
 * a server webhook can't.) The SDK provides the implementation by name.
 */
function buildSearchToolConfig() {
  return {
    type: 'client' as const,
    name: 'search_products',
    description:
      "Search the store's products and SHOW them to the user as cards on screen. Call this " +
      'whenever the user asks about products, prices, availability, or recommendations. Pass a ' +
      'SHORT query — just the product noun in the catalog language (e.g. "veido kremas", "serumas") ' +
      '— never include adjectives like dry/sensitive/hydrating, which return nothing.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Product noun to search for, e.g. "veido kremas".',
        },
      },
      required: ['query'],
    },
  }
}

/**
 * Ensures the bot's `search_products` client tool exists in the ElevenLabs
 * workspace (creating it once, then PATCHing). Returns its tool id.
 */
async function ensureSearchTool(db: SupabaseClient, bot: Bot): Promise<string> {
  const headers = { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' }
  const body = JSON.stringify({ tool_config: buildSearchToolConfig() })
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
export async function ensureAgent(db: SupabaseClient, bot: Bot): Promise<string> {
  const toolId = await ensureSearchTool(db, bot)
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
