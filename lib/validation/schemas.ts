import { z } from 'zod'
import type { BotConfig } from '@/lib/types'

// ---------------------------------------------------------------------------
// Bot configuration
// ---------------------------------------------------------------------------
export const leadFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  required: z.boolean().default(false),
})

export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM' // ElevenLabs "Rachel"
const DEFAULT_FALLBACK =
  "I'm not sure about that — let me take your details so someone can follow up."

// A quick action. A plain string is the legacy form (label === message). The
// object form carries a title (label) plus, optionally, a `prompt` (a richer
// message sent to the bot) or a `url` (an owner endpoint the server fetches and
// renders as product cards). url takes priority over prompt.
export const suggestedQuestionSchema = z.union([
  z.string().min(1),
  z.object({
    label: z.string().min(1).max(80),
    prompt: z.string().max(300).optional().or(z.literal('')),
    url: z.string().url().optional().or(z.literal('')),
  }),
])

export const languageContentSchema = z.object({
  greeting: z.string().min(1).max(300),
  suggestedQuestions: z.array(suggestedQuestionSchema).max(6).default([]),
  fallbackMessage: z.string().min(1).default(DEFAULT_FALLBACK),
})

/**
 * Upgrades a stored config from the pre-multilanguage shape (top-level
 * greeting/suggestedQuestions/fallbackMessage/language, voice.voiceId) to the
 * per-language shape (content.{lang}, languages[], voice.voices). Idempotent.
 */
export function normalizeBotConfig(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input
  const raw = { ...(input as Record<string, unknown>) }

  if (!raw.content) {
    const lang = (raw.language as string) === 'lt' ? 'lt' : 'en'
    const legacy = {
      greeting: (raw.greeting as string) ?? 'Hi! How can I help you today?',
      suggestedQuestions: (raw.suggestedQuestions as string[]) ?? [],
      fallbackMessage: (raw.fallbackMessage as string) ?? DEFAULT_FALLBACK,
    }
    raw.content = lang === 'lt' ? { en: legacy, lt: legacy } : { en: legacy }
  }
  if (!raw.languages) {
    raw.languages = (raw.language as string) === 'lt' ? ['en', 'lt'] : ['en']
  }
  if (raw.voice && typeof raw.voice === 'object') {
    const v = raw.voice as Record<string, unknown>
    if (!v.voices) v.voices = { en: (v.voiceId as string) ?? DEFAULT_VOICE_ID }
  }
  delete raw.greeting
  delete raw.suggestedQuestions
  delete raw.fallbackMessage
  delete raw.language
  return raw
}

/** Plain object schema (no preprocessing) — use for the configurator form (RHF). */
export const botConfigFormSchema = z.object({
  displayName: z.string().min(1).max(60),
  tagline: z.string().max(120).optional().or(z.literal('')),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  botAvatarUrl: z.string().url().optional().or(z.literal('')),
  privacyUrl: z.string().url().optional().or(z.literal('')),
  theme: z
    .object({
      primaryColor: z.string().default('#4f46e5'),
      position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
      bubbleIcon: z.string().optional(),
      cornerRadius: z.number().min(0).max(32).default(16),
      bubbleRadius: z.number().min(0).max(24).default(16),
      fontFamily: z.string().default('geist'),
      launcherStyle: z.enum(['circle', 'pill']).default('circle'),
      launcherLabel: z.string().max(40).optional().or(z.literal('')),
      launcherShowLogo: z.boolean().default(false),
      launcherColor: z.string().optional().or(z.literal('')),
      showCallButton: z.boolean().default(true),
      navButtonRadius: z.number().min(0).max(24).default(12),
      // Chat-body background. Color is the base layer; an optional image is
      // overlaid at backgroundImageOpacity (0–100). Header/composer are unaffected.
      backgroundColor: z.string().default('#ffffff'),
      backgroundImageUrl: z.string().url().optional().or(z.literal('')),
      backgroundImageOpacity: z.number().min(0).max(100).default(100),
      // Frosted-glass message bubbles (translucent + backdrop blur).
      glassBubbles: z.boolean().default(false),
      // Optional custom send-button icon (uploaded image URL).
      sendIconUrl: z.string().url().optional().or(z.literal('')),
      // Border for message bubbles + suggested-action tiles (width 0 = none).
      bubbleBorderColor: z.string().default('#e5e7eb'),
      bubbleBorderWidth: z.number().min(0).max(6).default(0),
    })
    .default({
      primaryColor: '#4f46e5',
      position: 'bottom-right',
      cornerRadius: 16,
      bubbleRadius: 16,
      fontFamily: 'geist',
      launcherStyle: 'circle',
      launcherShowLogo: false,
      showCallButton: true,
      navButtonRadius: 12,
      backgroundColor: '#ffffff',
      backgroundImageOpacity: 100,
      glassBubbles: false,
      bubbleBorderColor: '#e5e7eb',
      bubbleBorderWidth: 0,
    }),
  languages: z.array(z.enum(['en', 'lt'])).min(1).default(['en']),
  defaultLanguage: z.enum(['en', 'lt']).optional(),
  content: z.object({
    en: languageContentSchema,
    lt: languageContentSchema.optional(),
  }),
  systemPrompt: z.string().min(1).max(8000),
  persona: z
    .object({
      tone: z.string().default('friendly'),
      verbosity: z.enum(['concise', 'balanced', 'detailed']).default('balanced'),
    })
    .default({ tone: 'friendly', verbosity: 'balanced' }),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.3),
  leadCapture: z
    .object({
      enabled: z.boolean().default(false),
      trigger: z.enum(['on_fallback', 'after_n_messages', 'manual']).default('on_fallback'),
      afterNMessages: z.number().int().positive().optional(),
      fields: z.array(leadFieldSchema).default([]),
    })
    .default({ enabled: false, trigger: 'on_fallback', fields: [] }),
  allowedDomains: z.array(z.string()).default([]),
  commerce: z
    .object({
      enabled: z.boolean().default(false),
      provider: z.enum(['woocommerce', 'shopify']).default('woocommerce'),
      storeUrl: z.string().default(''),
      restKey: z.string().optional().or(z.literal('')),
      restSecret: z.string().optional().or(z.literal('')),
      shopifyDomain: z.string().optional().or(z.literal('')),
      shopifyToken: z.string().optional().or(z.literal('')),
      discount: z
        .object({
          enabled: z.boolean().default(false),
          code: z.string().optional().or(z.literal('')),
          description: z.string().max(200).optional().or(z.literal('')),
        })
        .default({ enabled: false }),
    })
    .default({ enabled: false, provider: 'woocommerce', storeUrl: '', discount: { enabled: false } }),
  voice: z
    .object({
      enabled: z.boolean().default(false),
      ttsEnabled: z.boolean().default(true),
      sttEnabled: z.boolean().default(true),
      voices: z
        .object({ en: z.string().default(DEFAULT_VOICE_ID), lt: z.string().optional() })
        .default({ en: DEFAULT_VOICE_ID }),
      llmModel: z.string().default('gpt-4o-mini'),
    })
    .default({
      enabled: false,
      ttsEnabled: true,
      sttEnabled: true,
      voices: { en: DEFAULT_VOICE_ID },
      llmModel: 'gpt-4o-mini',
    }),
})

export const botConfigSchema = z
  .preprocess(normalizeBotConfig, botConfigFormSchema)
  .superRefine((cfg, ctx) => {
    // Every enabled language must have content.
    for (const lang of cfg.languages) {
      if (!cfg.content[lang]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing ${lang === 'lt' ? 'Lithuanian' : 'English'} content for an enabled language`,
          path: ['content', lang],
        })
      }
    }
  })

/** A sensible starter config for a freshly-created bot (English only). */
export function defaultBotConfig(displayName: string): BotConfig {
  return botConfigSchema.parse({
    displayName,
    languages: ['en'],
    content: {
      en: {
        greeting: `Hi! I'm ${displayName}. How can I help you today?`,
        suggestedQuestions: [],
        fallbackMessage: DEFAULT_FALLBACK,
      },
    },
    systemPrompt:
      'You are a helpful, friendly assistant. Answer using only the provided context. ' +
      'If the answer is not in the context, say you are not sure.',
  }) as BotConfig
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------
export const createInviteSchema = z.object({
  email: z.string().email(),
  orgName: z.string().min(1).max(120),
})

// ---------------------------------------------------------------------------
// Public chat request (widget → /api/chat)
// ---------------------------------------------------------------------------
export const chatRequestSchema = z.object({
  publicKey: z.string().min(1),
  visitorId: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  language: z.enum(['en', 'lt']).optional(),
})

// ---------------------------------------------------------------------------
// Owner-curated voices
// ---------------------------------------------------------------------------
export const ownerVoiceSchema = z.object({
  voiceId: z.string().min(1),
  name: z.string().min(1).max(120),
  gender: z.enum(['male', 'female']),
  previewUrl: z.string().url().optional(),
})

// ---------------------------------------------------------------------------
// Preview (test playground) chat — authenticated, ephemeral
// ---------------------------------------------------------------------------
export const previewChatSchema = z.object({
  botId: z.string().uuid(),
  config: botConfigSchema,
  history: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() }))
    .default([]),
  message: z.string().min(1).max(4000),
  language: z.enum(['en', 'lt']).optional(),
})

export const previewTtsSchema = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().min(1),
  language: z.enum(['en', 'lt']).optional(),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type OwnerVoiceInput = z.infer<typeof ownerVoiceSchema>
export type PreviewChatInput = z.infer<typeof previewChatSchema>
