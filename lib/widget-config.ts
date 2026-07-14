import type {
  BotConfig,
  BotLanguage,
  LeadField,
  LeadTrigger,
  SuggestedQuestion,
  SuggestedQuestionAction,
} from '@/lib/types'
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

/** The typed behavior of a quick action ('handoff' | 'lead'), if any. */
export function sqAction(q: SuggestedQuestion): SuggestedQuestionAction | undefined {
  if (typeof q === 'string') return undefined
  return q.action === 'handoff' || q.action === 'lead' ? q.action : undefined
}

/** Behavior of a quick action. Precedence: action > url > prompt > message. */
export function sqMode(q: SuggestedQuestion): 'handoff' | 'lead' | 'url' | 'prompt' | 'message' {
  if (typeof q === 'string') return 'message'
  const action = sqAction(q)
  if (action) return action
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
    launcherPulse?: boolean
    launcherColor?: string
    launcherIcon?: string
    launcherCloseIcon?: string
    launcherIconColor?: string
    launcherBottomSpacing?: number
    launcherSideSpacing?: number
    showCallButton?: boolean
    showHandoffButton?: boolean
    callButtonColor?: string
    navButtonRadius?: number
    backgroundColor?: string
    backgroundImageUrl?: string
    backgroundImageOpacity?: number
    glassBubbles?: boolean
    sendIconUrl?: string
    composerFieldColor?: string
    composerBorderColor?: string
    sendButtonColor?: string
    botBubbleColor?: string
    bubbleBorderColor?: string
    bubbleBorderWidth?: number
  }
  languages: BotLanguage[]
  defaultLanguage?: BotLanguage
  /** Visitor-facing language picker (only meaningful when languages.length > 1). */
  showLanguageSelector: boolean
  content: Partial<Record<BotLanguage, PublicLanguageContent>>
  proactiveGreeting: {
    enabled: boolean
    delaySeconds: number
    frequency: 'once_per_session' | 'every_page'
    sound: 'none' | 'chime' | 'pop'
    messages: string[]
    backgroundColor: string
    textColor: string
    cornerRadius: number
    fontFamily: string
  }
  leadCapture: {
    enabled: boolean
    trigger: LeadTrigger
    afterNMessages?: number
    title?: string
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
export function publicBotConfig(
  config: BotConfig,
  entitlements?: Entitlements,
  voiceAddon?: boolean,
): PublicBotConfig {
  // Plan-gating: cap the number of visitor languages at the plan's limit,
  // keeping the bot's chosen primary first so a single-language plan serves
  // exactly that language (not a hardcoded English). Below the limit, leave
  // the configured order untouched (no gating in effect).
  const configured = config.languages ?? ['en']
  const limit = entitlements?.maxLanguages ?? Infinity
  const primary =
    config.defaultLanguage && configured.includes(config.defaultLanguage)
      ? config.defaultLanguage
      : (configured[0] ?? 'en')
  const languages: BotLanguage[] =
    limit >= configured.length
      ? configured
      : [primary, ...configured.filter((l) => l !== primary)].slice(0, limit)
  const leadCaptureEnabled =
    config.leadCapture.enabled && (entitlements ? entitlements.leadCapture : true)
  // The live voice CALL is a paid add-on. When the add-on is explicitly absent
  // we hide the call button (showCallButton) — TTS/STT in chat are unaffected.
  const callAllowed = voiceAddon !== false

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
      launcherPulse: config.theme.launcherPulse ?? false,
      launcherIcon: config.theme.launcherIcon ?? 'chat',
      launcherCloseIcon: config.theme.launcherCloseIcon ?? 'x',
      launcherIconColor: config.theme.launcherIconColor || undefined,
      launcherBottomSpacing: config.theme.launcherBottomSpacing ?? 20,
      launcherSideSpacing: config.theme.launcherSideSpacing ?? 20,
      // No separate user toggle anymore: the call button shows exactly when
      // voice is enabled AND the org's Voice add-on allows live calls.
      showCallButton: callAllowed && (config.voice?.enabled ?? false),
      showHandoffButton: config.theme.showHandoffButton ?? true,
      navButtonRadius: config.theme.navButtonRadius ?? 12,
      backgroundColor: config.theme.backgroundColor ?? '#ffffff',
      backgroundImageOpacity: config.theme.backgroundImageOpacity ?? 100,
      glassBubbles: config.theme.glassBubbles ?? false,
      bubbleBorderColor: config.theme.bubbleBorderColor ?? '#e5e7eb',
      bubbleBorderWidth: config.theme.bubbleBorderWidth ?? 0,
      ...(config.theme.bubbleIcon !== undefined && { bubbleIcon: config.theme.bubbleIcon }),
      ...(config.theme.launcherLabel ? { launcherLabel: config.theme.launcherLabel } : {}),
      ...(config.theme.launcherColor ? { launcherColor: config.theme.launcherColor } : {}),
      ...(config.theme.callButtonColor ? { callButtonColor: config.theme.callButtonColor } : {}),
      ...(config.theme.botBubbleColor ? { botBubbleColor: config.theme.botBubbleColor } : {}),
      ...(config.theme.backgroundImageUrl ? { backgroundImageUrl: config.theme.backgroundImageUrl } : {}),
      ...(config.theme.sendIconUrl ? { sendIconUrl: config.theme.sendIconUrl } : {}),
      ...(config.theme.composerFieldColor ? { composerFieldColor: config.theme.composerFieldColor } : {}),
      ...(config.theme.composerBorderColor ? { composerBorderColor: config.theme.composerBorderColor } : {}),
      ...(config.theme.sendButtonColor ? { sendButtonColor: config.theme.sendButtonColor } : {}),
    },
    languages,
    defaultLanguage:
      config.defaultLanguage && languages.includes(config.defaultLanguage)
        ? config.defaultLanguage
        : languages[0],
    showLanguageSelector: languages.length > 1 && (config.showLanguageSelector ?? false),
    content,
    proactiveGreeting: {
      enabled: config.proactiveGreeting?.enabled ?? false,
      delaySeconds: config.proactiveGreeting?.delaySeconds ?? 3,
      frequency: config.proactiveGreeting?.frequency ?? 'once_per_session',
      sound: config.proactiveGreeting?.sound ?? 'none',
      messages: (config.proactiveGreeting?.messages?.[primary] ?? [])
        .map((message) => message.text.trim())
        .filter(Boolean),
      backgroundColor: config.proactiveGreeting?.backgroundColor ?? '#ffffff',
      textColor: config.proactiveGreeting?.textColor ?? '#111827',
      cornerRadius: config.proactiveGreeting?.cornerRadius ?? 14,
      fontFamily: config.proactiveGreeting?.fontFamily ?? 'inherit',
    },
    leadCapture: {
      enabled: leadCaptureEnabled,
      trigger: config.leadCapture.trigger,
      afterNMessages: config.leadCapture.afterNMessages,
      title: config.leadCapture.title,
      fields: config.leadCapture.fields,
    },
    hideBadge: entitlements?.removeBadge ?? false,
    // Only flags — never the raw voiceId (TTS runs server-side).
    voice: {
      enabled: config.voice?.enabled ?? false,
      // Voice = the live-call conversational agent only (transcript shown in
      // chat). Standalone in-chat TTS/STT is retired — always off.
      ttsEnabled: false,
      sttEnabled: false,
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
