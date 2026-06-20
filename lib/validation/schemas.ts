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

export const botConfigSchema = z.object({
  displayName: z.string().min(1).max(60),
  avatarUrl: z.string().url().optional(),
  theme: z
    .object({
      primaryColor: z.string().default('#4f46e5'),
      position: z.enum(['bottom-right', 'bottom-left']).default('bottom-right'),
      bubbleIcon: z.string().optional(),
    })
    .default({ primaryColor: '#4f46e5', position: 'bottom-right' }),
  greeting: z.string().min(1).max(300),
  systemPrompt: z.string().min(1).max(8000),
  persona: z
    .object({
      tone: z.string().default('friendly'),
      verbosity: z.enum(['concise', 'balanced', 'detailed']).default('balanced'),
    })
    .default({ tone: 'friendly', verbosity: 'balanced' }),
  model: z.string().default('gpt-4o-mini'),
  temperature: z.number().min(0).max(2).default(0.3),
  suggestedQuestions: z.array(z.string().min(1)).max(6).default([]),
  fallbackMessage: z
    .string()
    .min(1)
    .default("I'm not sure about that — let me take your details so someone can follow up."),
  leadCapture: z
    .object({
      enabled: z.boolean().default(false),
      trigger: z.enum(['on_fallback', 'after_n_messages', 'manual']).default('on_fallback'),
      afterNMessages: z.number().int().positive().optional(),
      fields: z.array(leadFieldSchema).default([]),
    })
    .default({ enabled: false, trigger: 'on_fallback', fields: [] }),
  allowedDomains: z.array(z.string()).default([]),
  language: z.enum(['en', 'lt']).default('en'),
  voice: z
    .object({
      enabled: z.boolean().default(false),
      ttsEnabled: z.boolean().default(true),
      sttEnabled: z.boolean().default(true),
      // ElevenLabs default voice ("Rachel").
      voiceId: z.string().default('21m00Tcm4TlvDq8ikWAM'),
    })
    .default({ enabled: false, ttsEnabled: true, sttEnabled: true, voiceId: '21m00Tcm4TlvDq8ikWAM' }),
})

/** A sensible starter config for a freshly-created bot. */
export function defaultBotConfig(displayName: string): BotConfig {
  return botConfigSchema.parse({
    displayName,
    greeting: `Hi! I'm ${displayName}. How can I help you today?`,
    systemPrompt:
      'You are a helpful, friendly assistant. Answer using only the provided context. ' +
      'If the answer is not in the context, say you are not sure.',
    suggestedQuestions: [],
  })
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
})

export const previewTtsSchema = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().min(1),
})

export type ChatRequest = z.infer<typeof chatRequestSchema>
export type CreateInviteInput = z.infer<typeof createInviteSchema>
export type OwnerVoiceInput = z.infer<typeof ownerVoiceSchema>
export type PreviewChatInput = z.infer<typeof previewChatSchema>
