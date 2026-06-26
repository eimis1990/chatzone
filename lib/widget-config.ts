import type { BotConfig, BotLanguage, LeadField, LeadTrigger, SuggestedQuestion } from '@/lib/types'
import type { Entitlements } from '@/lib/entitlements'

/** The button text for a suggested question. */
export function sqLabel(q: SuggestedQuestion): string {
  return typeof q === 'string' ? q : q.label
}

/** The message actually sent to the bot when a suggestion is clicked. */
export function sqPrompt(q: SuggestedQuestion): string {
  if (typeof q === 'string') return q
  return q.prompt?.trim() || q.label
}

/** The owner endpoint a "fetch" quick action pulls products from (else undefined). */
export function sqUrl(q: SuggestedQuestion): string | undefined {
  if (typeof q === 'string') return undefined
  const u = q.url?.trim()
  return u || undefined
}

/** Behavior of a quick action: fetch a URL, send a prompt, or send the label. */
export function sqMode(q: SuggestedQuestion): 'url' | 'prompt' | 'message' {
  if (typeof q === 'string') return 'message'
  if (q.url?.trim()) return 'url'
  if (q.prompt?.trim()) return 'prompt'
  return 'message'
}

/** Per-language browser-safe content (no fallback — server streams that). */
export interface PublicLanguageContent {
  greeting: string
  suggestedQuestions: SuggestedQuestion[]
}

/**
 * The subset of BotConfig that is safe to send to the browser.
 *
 * MUST NOT include: systemPrompt, model, temperature, allowedDomains,
 * persona, fallbackMessage, voice ids — those are server-only details.
 */
export interface PublicBotConfig {
  displayName: string
  tagline?: string
  avatarUrl?: string
  botAvatarUrl?: string
  privacyUrl?: string
  theme: {
    primaryColor: string
    position: 'bottom-right' | 'bottom-left'
    bubbleIcon?: string
    cornerRadius: number
    bubbleRadius: number
    fontFamily?: string
    launcherStyle?: 'circle' | 'pill'
    launcherLabel?: string
    launcherShowLogo?: boolean
    launcherColor?: string
    showCallButton?: boolean
    navButtonRadius?: number
    backgroundColor?: string
    backgroundImageUrl?: string
    backgroundImageOpacity?: number
  }
  languages: BotLanguage[]
  defaultLanguage?: BotLanguage
  content: Partial<Record<BotLanguage, PublicLanguageContent>>
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
  /** Hide the "Powered by Loqara" badge (true on plans that allow it). */
  hideBadge?: boolean
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
export function publicBotConfig(config: BotConfig, entitlements?: Entitlements): PublicBotConfig {
  // Plan-gating: free plans are English-only and can't capture leads or hide
  // the badge. Enforced here, the single public entry point for the widget.
  const languages: BotLanguage[] =
    entitlements && !entitlements.allLanguages ? ['en'] : (config.languages ?? ['en'])
  const leadCaptureEnabled =
    config.leadCapture.enabled && (entitlements ? entitlements.leadCapture : true)

  const content: Partial<Record<BotLanguage, PublicLanguageContent>> = {}
  for (const lang of languages) {
    const c = config.content?.[lang]
    if (c) content[lang] = { greeting: c.greeting, suggestedQuestions: c.suggestedQuestions }
  }

  const result: PublicBotConfig = {
    displayName: config.displayName,
    theme: {
      primaryColor: config.theme.primaryColor,
      position: config.theme.position,
      cornerRadius: config.theme.cornerRadius ?? 16,
      bubbleRadius: config.theme.bubbleRadius ?? 16,
      fontFamily: config.theme.fontFamily ?? 'geist',
      launcherStyle: config.theme.launcherStyle ?? 'circle',
      launcherShowLogo: config.theme.launcherShowLogo ?? false,
      showCallButton: config.theme.showCallButton ?? true,
      navButtonRadius: config.theme.navButtonRadius ?? 12,
      backgroundColor: config.theme.backgroundColor ?? '#ffffff',
      backgroundImageOpacity: config.theme.backgroundImageOpacity ?? 100,
      ...(config.theme.bubbleIcon !== undefined && { bubbleIcon: config.theme.bubbleIcon }),
      ...(config.theme.launcherLabel ? { launcherLabel: config.theme.launcherLabel } : {}),
      ...(config.theme.launcherColor ? { launcherColor: config.theme.launcherColor } : {}),
      ...(config.theme.backgroundImageUrl ? { backgroundImageUrl: config.theme.backgroundImageUrl } : {}),
    },
    languages,
    defaultLanguage:
      config.defaultLanguage && languages.includes(config.defaultLanguage)
        ? config.defaultLanguage
        : languages[0],
    content,
    leadCapture: {
      enabled: leadCaptureEnabled,
      trigger: config.leadCapture.trigger,
      fields: config.leadCapture.fields,
    },
    hideBadge: entitlements?.removeBadge ?? false,
    // Only flags — never the raw voiceId (TTS runs server-side).
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? false,
      sttEnabled: config.voice?.sttEnabled ?? false,
    },
  }

  if (config.tagline) {
    result.tagline = config.tagline
  }
  if (config.avatarUrl !== undefined) {
    result.avatarUrl = config.avatarUrl
  }
  if (config.botAvatarUrl) {
    result.botAvatarUrl = config.botAvatarUrl
  }
  if (config.privacyUrl) {
    result.privacyUrl = config.privacyUrl
  }

  return result
}
