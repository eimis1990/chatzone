import type { BotConfig, LeadField, LeadTrigger } from '@/lib/types'

/**
 * The subset of BotConfig that is safe to send to the browser.
 *
 * MUST NOT include: systemPrompt, model, temperature, allowedDomains,
 * persona, fallbackMessage — those are server-only operational details.
 */
export interface PublicBotConfig {
  displayName: string
  avatarUrl?: string
  theme: {
    primaryColor: string
    position: 'bottom-right' | 'bottom-left'
    bubbleIcon?: string
  }
  greeting: string
  suggestedQuestions: string[]
  leadCapture: {
    enabled: boolean
    trigger: LeadTrigger
    fields: LeadField[]
  }
  voice: {
    enabled: boolean
    ttsEnabled: boolean
    sttEnabled: boolean
  }
}

/**
 * Strips all server-sensitive fields from a BotConfig and returns only the
 * browser-safe subset suitable for the public widget-config endpoint.
 *
 * Properties intentionally excluded:
 *  - systemPrompt  — reveals the bot's internal instructions
 *  - model         — reveals provider/model choice
 *  - temperature   — reveals inference parameters
 *  - allowedDomains — reveals security configuration
 *  - persona       — reveals tone/verbosity tuning
 *  - fallbackMessage — not needed client-side (server streams it)
 */
export function publicBotConfig(config: BotConfig): PublicBotConfig {
  const result: PublicBotConfig = {
    displayName: config.displayName,
    theme: {
      primaryColor: config.theme.primaryColor,
      position: config.theme.position,
      ...(config.theme.bubbleIcon !== undefined && { bubbleIcon: config.theme.bubbleIcon }),
    },
    greeting: config.greeting,
    suggestedQuestions: config.suggestedQuestions,
    leadCapture: {
      enabled: config.leadCapture.enabled,
      trigger: config.leadCapture.trigger,
      fields: config.leadCapture.fields,
    },
    // Only flags — never the raw voiceId (TTS runs server-side).
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? false,
      sttEnabled: config.voice?.sttEnabled ?? false,
    },
  }

  if (config.avatarUrl !== undefined) {
    result.avatarUrl = config.avatarUrl
  }

  return result
}
