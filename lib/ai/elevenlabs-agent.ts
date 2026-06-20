import { createHash, randomBytes } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import { MissingVoiceKeyError } from '@/lib/ai/tts'

const API = 'https://api.elevenlabs.io/v1'
const SETTING_TOKEN = 'cbz_llm_token'
const SETTING_SECRET_ID = 'elevenlabs_llm_secret_id'

export interface AgentConfig {
  name: string
  conversation_config: {
    agent: {
      first_message: string
      language: string
      prompt: {
        prompt: string
        llm: string
        custom_llm: {
          url: string
          model_id: string
          api_key: { secret_id: string }
          api_type: string
        }
      }
    }
    tts: { voice_id: string; model_id: string }
  }
}

/** Maps a bot + deployment URL + workspace secret to an ElevenLabs agent config. */
export function buildAgentConfig(bot: Bot, appUrl: string, secretId: string): AgentConfig {
  const cfg = bot.config
  const language = cfg.language ?? 'en'
  // ElevenLabs requires English agents to use a v2 TTS model; non-English needs
  // a multilingual model (v2.5).
  const ttsModel = language === 'en' ? 'eleven_turbo_v2' : 'eleven_turbo_v2_5'
  return {
    name: `cbz-${bot.id}`,
    conversation_config: {
      agent: {
        first_message: cfg.greeting,
        language,
        prompt: {
          prompt: cfg.systemPrompt,
          llm: 'custom-llm',
          custom_llm: {
            url: `${appUrl}/api/llm/${bot.public_key}`,
            model_id: cfg.model || 'gpt-4o-mini',
            api_key: { secret_id: secretId },
            api_type: 'chat_completions',
          },
        },
      },
      tts: { voice_id: cfg.voice?.voiceId ?? '', model_id: ttsModel },
    },
  }
}

/** Stable hash of the bot fields that require re-syncing the agent when changed. */
export function agentConfigHash(bot: Bot, appUrl: string): string {
  const cfg = bot.config
  const material = JSON.stringify([
    cfg.greeting,
    cfg.language ?? 'en',
    cfg.voice?.voiceId ?? '',
    cfg.model ?? '',
    cfg.systemPrompt,
    bot.public_key,
    appUrl,
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

/** The shared custom-LLM bearer token (for the /api/llm endpoint to verify). */
export async function getLlmToken(db: SupabaseClient): Promise<string | null> {
  return getSetting(db, SETTING_TOKEN)
}

/**
 * Ensures the bot has an up-to-date ElevenLabs agent; creates or PATCHes as
 * needed. Returns the agent_id. Uses the service-role db client.
 */
export async function ensureAgent(db: SupabaseClient, bot: Bot, appUrl: string): Promise<string> {
  const hash = agentConfigHash(bot, appUrl)
  if (bot.elevenlabs_agent_id && bot.elevenlabs_agent_hash === hash) {
    return bot.elevenlabs_agent_id
  }

  const { secretId } = await ensureLlmAuth(db)
  const config = buildAgentConfig(bot, appUrl, secretId)

  let agentId = bot.elevenlabs_agent_id ?? ''
  if (!agentId) {
    const res = await fetch(`${API}/convai/agents/create`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error(`Failed to create agent: HTTP ${res.status}`)
    const data = (await res.json()) as { agent_id: string }
    agentId = data.agent_id
  } else {
    const res = await fetch(`${API}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    })
    if (!res.ok) throw new Error(`Failed to update agent: HTTP ${res.status}`)
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
