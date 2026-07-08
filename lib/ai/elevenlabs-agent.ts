import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot, BotLanguage } from '@/lib/types'
import { MissingVoiceKeyError } from '@/lib/ai/tts'
import { isValidVoiceLlm, DEFAULT_VOICE_LLM } from '@/lib/ai/voice-models'
import { orderLookupEnabled, getDiscount } from '@/lib/commerce'

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
        // Explicitly null so a PATCH CLEARS any stale reasoning_effort left by a
        // previously-selected reasoning model. ElevenLabs merges PATCHes, and
        // models that don't support reasoning effort (e.g. Qwen) reject the
        // config with "Not supported reasoning effort" if a stale value remains.
        reasoning_effort: null
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
  // Allow the client SDK to set the conversation language AND the TTS voice at
  // session start, so a visitor who picked Lithuanian starts the call in
  // Lithuanian with the Lithuanian voice. (Per-language voice can't go in
  // language_presets — ElevenLabs doesn't allow `lt` there — so we override the
  // voice per session instead.)
  platform_settings: {
    overrides: {
      conversation_config_override: {
        agent: { language: boolean }
        tts: { voice_id: boolean }
      }
    }
  }
}

const LANG_NAME: Record<string, string> = { en: 'English', lt: 'Lithuanian' }

/** Builds the voice agent's prompt, adding tool guidance for what's configured. */
function buildAgentPrompt(cfg: Bot['config'], toolIds: string[], languages: BotLanguage[]): string {
  if (!toolIds.length) return cfg.systemPrompt
  const lt = languages.includes('lt')
  const parts = [
    cfg.systemPrompt,
    // Voice delivery style — applies to everything the agent says aloud.
    'You are speaking out loud. Be warm, friendly and personable — sound genuinely happy to help, acknowledge what the person actually asked for in your own words, and never come across as cold, curt, or robotic. Talk like a real, attentive shop assistant having a natural conversation, not a script. VARY how you speak: never open consecutive replies with the same word or a stock phrase — in particular do NOT habitually start with "Žinoma" / "Of course". Keep answers short and conversational — usually one or two sentences — and never read long passages verbatim; summarise. Do NOT use emojis, asterisks, or other symbols, since everything you say is read aloud. When you say an email address or website, say it the natural way a person would: read "hello@example.com" as "hello at example dot com" and "https://www.example.com" as "example dot com". Never spell an address out letter by letter and never say "h t t p s".',
    'When the user asks anything informational about this business — its services, policies, hours, pricing, shipping, returns, contact details (email, phone, address), or any other fact — ALWAYS call the `search_knowledge` tool with their question first and answer ONLY from what it returns, in one or two natural sentences. The business\'s own email, phone, website and address are PUBLIC contact details — share them plainly when asked; never treat them as personal or private information, and never refuse or say you lack access before calling the tool. If it returns nothing relevant, say you do not have that detail and offer to connect them with a person — never invent an answer.',
    `When the user asks about products, prices, availability, gifts, gift coupons/vouchers, or wants recommendations, you MUST call the \`search_products\` tool to check the live catalog BEFORE answering — never say something is unavailable or that "we don't have it" from memory. A gift coupon/voucher ("dovanų kuponas") is a PRODUCT to search for, not a discount code. Each search takes a SHORT descriptive phrase — the product type plus at most 1-2 qualifiers${
      lt ? ' in Lithuanian (e.g. "kvapni žvakė", "kvepalai", "veido kremas sausai odai")' : ''
    } — never a whole sentence. For an OPEN or GIFT request, do NOT search the word "gift"/"dovana" itself (that only finds items named that) — instead think of a few concrete gift categories that suit the recipient (e.g. for a woman: kvepalai, žvakė, kosmetikos rinkinys, veido priežiūra) and search for EACH, so you show a varied set. If the user says WHO it is for (for men/a man/husband/dad → men; for women/a woman/mum/her → women; for a child/kid/baby → kids), also set the tool's \`audience\` so results only include items that suit that person — and never suggest something meant for a different person. If a search returns nothing, retry with a synonym, the base form, and the same noun in the other language before saying it is unavailable. The matching products appear on screen as cards automatically, so DO NOT read out product names, prices, or details — the cards carry that. Instead say ONE or two short, genuinely warm sentences that acknowledge THIS specific request in your own words (that it's for dry skin, for their wife, a more premium option, and so on) and invite them to take a look. Regardless of any example phrasing elsewhere in these instructions, VARY your wording every time and do NOT open with "Žinoma" / "Of course" out of habit. Where it fits naturally, add a brief helpful touch or ONE short follow-up question (budget, scent, skin type, who it's for) to help them choose — but never interrogate. Aim for a tone like these, but NEVER reuse them verbatim — improvise fresh each turn: "For dry skin, these should feel lovely — take a look:" / "Lovely gift idea — here are a few she might love:" / "If you're after something more premium, these stand out:".`,
    'You CANNOT place orders, take payment, or complete a purchase, and you must NEVER ask for the person\'s name, address, phone number, or email in order to buy something — orders are not taken over the call. So never offer to take an order or collect delivery/contact details. When they want to buy or have chosen an item, the products are shown on screen as cards — tell them to tap the one they want to open it and complete the order on the website. You are glad to help them choose or answer questions, but the checkout itself happens on the site.',
  ]
  if (orderLookupEnabled(cfg.commerce)) {
    parts.push(
      'If the user asks about an existing order (status, where it is, tracking), ask for BOTH the order ' +
        'number AND the email used on the order, then call `order_status` with both. Never call it with ' +
        'only one, and never guess. The order details appear on screen as a card, so confirm briefly. If ' +
        'the result says no match, relay that and offer to connect them with a person — never invent details.',
    )
  }
  if (getDiscount(cfg.commerce).enabled) {
    parts.push(
      'If the user asks for a discount, coupon, or promo, call `discount_code` and tell them the code it ' +
        'returns (with its description). Never invent a code.',
    )
  }
  return parts.join('\n\n')
}

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
  // The agent's default language follows the bot's primary (defaultLanguage),
  // not array order — languages[] is stored as ['en','lt'] regardless of primary.
  const defaultLang =
    cfg.defaultLanguage && languages.includes(cfg.defaultLanguage)
      ? cfg.defaultLanguage
      : languages[0]
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
    // Human-readable name so agents are findable in the ElevenLabs dashboard,
    // with the bot id appended for an exact match.
    name: `${cfg.displayName?.trim() || 'Loqara agent'} · ${bot.id}`,
    conversation_config: {
      agent: {
        first_message: defaultContent?.greeting ?? '',
        language: defaultLang,
        prompt: {
          prompt: buildAgentPrompt(cfg, toolIds, languages),
          llm,
          custom_llm: null,
          reasoning_effort: null,
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
      overrides: { conversation_config_override: { agent: { language: true }, tts: { voice_id: true } } },
    },
  }
}

/** Stable hash of the bot fields that require re-syncing the agent when changed. */
export function agentConfigHash(bot: Bot, toolIds: string[] = []): string {
  const cfg = bot.config
  const material = JSON.stringify([
    'v21-voice-prompt-variety', // bump to force re-sync when the agent payload shape changes
    cfg.displayName, // agent name follows the bot's display name
    cfg.languages,
    cfg.defaultLanguage ?? null,
    cfg.content,
    cfg.voice?.voices,
    cfg.voice?.llmModel ?? DEFAULT_VOICE_LLM,
    cfg.systemPrompt,
    bot.public_key,
    toolIds,
    // Transactional skills affect the tool set + prompt.
    orderLookupEnabled(cfg.commerce),
    getDiscount(cfg.commerce).enabled,
    cfg.commerce?.storeUrl ?? '',
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
function buildKnowledgeToolConfig() {
  return {
    type: 'client' as const,
    name: 'search_knowledge',
    description:
      "Look up the business's own knowledge base to answer ANY informational question about the " +
      'company — its services, policies, opening hours, pricing, shipping, returns, contact details ' +
      '(email, phone, address), or any other fact. Call this whenever the user asks something ' +
      'informational and answer ONLY from what it returns; never refuse or claim you lack access ' +
      'before calling it.',
    // Block the conversation until the client returns the retrieved context, and
    // pass it to the LLM — without this the agent only gets a generic ack
    // ("Tool called successfully") and can't answer from the knowledge base.
    expects_response: true,
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: "The user's question, in their own words.",
        },
      },
      required: ['query'],
    },
  }
}

function buildSearchToolConfig() {
  return {
    type: 'client' as const,
    name: 'search_products',
    description:
      "Search the store's products and SHOW them to the user as cards on screen. Call this " +
      'whenever the user asks about products, prices, availability, or recommendations. Pass a ' +
      'SHORT query — just the product noun in the catalog language (e.g. "veido kremas", "serumas") ' +
      '— never include adjectives like dry/sensitive/hydrating, which return nothing. When the user ' +
      'names who it is for (a gift/product "for men", "for women", "for a child"), ALSO set `audience` ' +
      'so the results only include items that suit that person.',
    parameters: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string' as const,
          description: 'Product noun to search for, e.g. "veido kremas".',
        },
        audience: {
          type: 'string' as const,
          enum: ['women', 'men', 'kids', 'unisex'],
          description: 'Set ONLY when the user says who the product/gift is for.',
        },
      },
      required: ['query'],
    },
  }
}

/** Client tool config for `order_status` (params: order id + email). */
function buildOrderToolConfig() {
  return {
    type: 'client' as const,
    name: 'order_status',
    description:
      'Look up the status of an existing order and show it on screen. Call this ONLY after you have ' +
      'BOTH the order number AND the email used on the order — ask the user for whatever is missing ' +
      'first, and never guess.',
    parameters: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string' as const, description: 'The order number from the receipt/confirmation.' },
        email: { type: 'string' as const, description: 'The email address used to place the order.' },
      },
      required: ['orderId', 'email'],
    },
  }
}

/** Client tool config for `discount_code` (no params). */
function buildDiscountToolConfig() {
  return {
    type: 'client' as const,
    name: 'discount_code',
    description: 'Provide the store discount/promo code when the user asks for a discount, coupon, or deal.',
    parameters: { type: 'object' as const, properties: {}, required: [] as string[] },
  }
}

/**
 * Ensures a client tool (stored under `key`) exists in the ElevenLabs workspace
 * (creating it once, then PATCHing). Returns its tool id.
 */
async function ensureTool(db: SupabaseClient, key: string, toolConfig: object): Promise<string> {
  const headers = { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' }
  const body = JSON.stringify({ tool_config: toolConfig })
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

/** Ensures all applicable client tools for a bot and returns their ids. */
async function ensureTools(db: SupabaseClient, bot: Bot): Promise<string[]> {
  // Knowledge lookup is core to every bot; product search is always available too
  // (its endpoint falls back to knowledge when the store has no match).
  const ids = [
    await ensureTool(db, `cbz_tool_kb_${bot.id}`, buildKnowledgeToolConfig()),
    await ensureTool(db, `cbz_tool_${bot.id}`, buildSearchToolConfig()),
  ]
  if (orderLookupEnabled(bot.config.commerce)) {
    ids.push(await ensureTool(db, `cbz_tool_order_${bot.id}`, buildOrderToolConfig()))
  }
  if (getDiscount(bot.config.commerce).enabled) {
    ids.push(await ensureTool(db, `cbz_tool_discount_${bot.id}`, buildDiscountToolConfig()))
  }
  return ids
}

/**
 * Ensures the bot has an up-to-date ElevenLabs agent; creates or PATCHes as
 * needed. Returns the agent_id. Uses the service-role db client.
 */
export async function ensureAgent(db: SupabaseClient, bot: Bot): Promise<string> {
  const toolIds = await ensureTools(db, bot)

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

/**
 * Best-effort agent re-sync after a config save, so the ElevenLabs agent's name
 * and prompt track the saved system prompt immediately (not only on the next
 * voice call). Only runs when voice is enabled; never throws — a config save
 * must not fail because ElevenLabs is unavailable or unconfigured.
 */
export async function syncVoiceAgent(botId: string): Promise<void> {
  try {
    // Lazy import: `@/lib/supabase/service` is `server-only`, and this module is
    // also imported by unit tests for buildAgentConfig/agentConfigHash.
    const { createServiceClient } = await import('@/lib/supabase/service')
    const svc = createServiceClient()
    const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
    if (!bot || !bot.config.voice?.enabled) return
    await ensureAgent(svc, bot)
  } catch {
    // Non-fatal: the config is already saved; the next voice call will re-sync.
  }
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
