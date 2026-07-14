'use client'

/**
 * TestChat — the configurator preview.
 *
 * Renders the EXACT live widget component (`ChatWindow`) wired to a preview
 * transport (authenticated `/api/preview/*`, using the current unsaved config),
 * so the preview can never visually drift from what visitors actually see.
 * It only adds the surrounding chrome: a floating card, launcher bubble,
 * "Start over", and the "Powered by" footer.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { XIcon } from 'lucide-react'
import { LAUNCHER_ICONS, LAUNCHER_CLOSE_ICONS } from '@/lib/launcher-icons'
import { ChatWindow } from '@/components/widget/ChatWindow'
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'
import { detectHandoffIntent, HANDOFF_ACK } from '@/lib/handoff'
import type { ChatTransport } from '@/lib/widget-transport'
import type { PublicBotConfig } from '@/lib/widget-config'
import { playGreetingSound } from '@/lib/greeting-sound'
import type { BotConfig, BotLanguage, SuggestedQuestion } from '@/lib/types'
import { POWERED_BY_URL, readableTextColor } from '@/lib/utils'
import { fontStack } from '@/lib/fonts'

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

// Partial form values — fields may be undefined mid-edit.
type LiveConfig = {
  displayName?: string
  tagline?: string
  showLanguageSelector?: boolean
  theme?: Partial<BotConfig['theme']>
  voice?: {
    enabled?: boolean
    ttsEnabled?: boolean
    sttEnabled?: boolean
    voices?: Partial<Record<string, string>>
  }
  model?: string
  temperature?: number
  systemPrompt?: string
  persona?: Partial<BotConfig['persona']>
  leadCapture?: {
    enabled?: boolean
    trigger?: BotConfig['leadCapture']['trigger']
    afterNMessages?: number
    fields?: Array<{ key: string; label: string; required?: boolean }>
  }
  allowedDomains?: string[]
  avatarUrl?: string
  botAvatarUrl?: string
  privacyUrl?: string
  languages?: BotLanguage[]
  defaultLanguage?: BotLanguage
  content?: Partial<
    Record<
      BotLanguage,
      { greeting?: string; suggestedQuestions?: SuggestedQuestion[]; fallbackMessage?: string }
    >
  >
  proactiveGreeting?: {
    enabled?: boolean
    delaySeconds?: number
    frequency?: 'once_per_session' | 'every_page'
    sound?: 'none' | 'chime' | 'pop'
    messages?: Partial<Record<BotLanguage, Array<{ text?: string }>>>
    backgroundColor?: string
    textColor?: string
    cornerRadius?: number
    fontFamily?: string
  }
  commerce?: {
    enabled?: boolean
    provider?: 'woocommerce' | 'shopify' | 'magento' | 'feed'
    storeUrl?: string
    restKey?: string
    restSecret?: string
    shopifyDomain?: string
    shopifyToken?: string
    magentoToken?: string
    feedUrl?: string
    discount?: { enabled?: boolean; code?: string; description?: string }
  }
}

interface TestChatProps {
  botId: string
  config: LiveConfig
  activeLang: BotLanguage
}

export function TestChat({ botId, config, activeLang }: TestChatProps) {
  const proactiveEnabled = config.proactiveGreeting?.enabled ?? false
  const prefersReducedMotion = useReducedMotion()
  const [isOpen, setIsOpen] = useState(() => !proactiveEnabled)
  const [previewGreetingDismissed, setPreviewGreetingDismissed] = useState(false)
  const previousProactiveEnabled = useRef(proactiveEnabled)

  const proactiveSound = config.proactiveGreeting?.sound ?? 'none'
  useEffect(() => {
    const turnedOn = proactiveEnabled && !previousProactiveEnabled.current
    previousProactiveEnabled.current = proactiveEnabled
    if (turnedOn) {
      setIsOpen(false)
      setPreviewGreetingDismissed(false)
      // Same sound the live widget plays when the greeting appears.
      playGreetingSound(proactiveSound)
    }
  }, [proactiveEnabled, proactiveSound])

  // Always read the latest config inside the (stable) transport.
  const configRef = useRef(config)
  configRef.current = config

  const publicConfig = buildPreviewPublicConfig(config)
  const cornerRadius = config.theme?.cornerRadius ?? 16
  const primaryColor = config.theme?.primaryColor ?? '#4f46e5'
  const launcherAvatar = config.avatarUrl || config.botAvatarUrl
  const launcherColor = config.theme?.launcherColor || primaryColor
  const launcherStyleCfg = config.theme?.launcherStyle ?? 'circle'
  const launcherIconSvg =
    LAUNCHER_ICONS[(config.theme?.launcherIcon as keyof typeof LAUNCHER_ICONS) ?? 'chat'] ?? LAUNCHER_ICONS.chat
  const closeIconSvg =
    LAUNCHER_CLOSE_ICONS[(config.theme?.launcherCloseIcon as keyof typeof LAUNCHER_CLOSE_ICONS) ?? 'x'] ??
    LAUNCHER_CLOSE_ICONS.x
  // Visualize the configured spacing as a shift away from the pane corner
  // (the live widget offsets from the viewport edges the same way).
  const spacingShift = {
    x: -(((config.theme?.launcherSideSpacing ?? 20) as number) - 20),
    y: -(((config.theme?.launcherBottomSpacing ?? 20) as number) - 20),
  }
  const launcherLabel = config.theme?.launcherLabel ?? ''
  const showLauncherLogo = (config.theme?.launcherShowLogo ?? false) && !!launcherAvatar
  const asPill = launcherStyleCfg === 'pill' && !!launcherLabel && !isOpen
  const proactiveMessage = config.proactiveGreeting?.messages?.[activeLang]
    ?.map((variant) => variant.text?.trim())
    .find(Boolean)
  const proactiveBackground = config.proactiveGreeting?.backgroundColor || '#ffffff'
  const proactiveText = config.proactiveGreeting?.textColor || '#111827'
  const proactiveRadius = config.proactiveGreeting?.cornerRadius ?? 14
  const proactiveFont =
    config.proactiveGreeting?.fontFamily === 'inherit' || !config.proactiveGreeting?.fontFamily
      ? fontStack(config.theme?.fontFamily)
      : fontStack(config.proactiveGreeting.fontFamily)
  // Preview pulse: a ONE-SHOT demo. The live widget pulses forever; here it
  // plays a single breathe + wave the moment the Pulse toggle turns on, then
  // removes itself. Never auto-plays on mount/return, and toggling off→on
  // replays it once. (The live behavior is unchanged — see public/widget.js.)
  const pulseEnabled = (config.theme?.launcherPulse ?? false) && launcherStyleCfg === 'circle'
  const [pulseDemo, setPulseDemo] = useState(false)
  const prevPulseEnabled = useRef(pulseEnabled) // seed with mount value → no demo on mount
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const turnedOn = pulseEnabled && !prevPulseEnabled.current
    prevPulseEnabled.current = pulseEnabled
    if (!turnedOn) return
    setPulseDemo(true)
    // Fallback cleanup in case animationend never fires (e.g. reduced-motion).
    if (pulseTimer.current) clearTimeout(pulseTimer.current)
    pulseTimer.current = setTimeout(() => setPulseDemo(false), 2200)
  }, [pulseEnabled])
  useEffect(() => () => { if (pulseTimer.current) clearTimeout(pulseTimer.current) }, [])

  const transport = useMemo<ChatTransport>(
    () => createPreviewTransport(botId, () => buildFullConfig(configRef.current)),
    [botId],
  )

  return (
    <div
      className="relative pointer-events-none select-none transition-transform"
      style={{ transform: `translate(${spacingShift.x}px, ${spacingShift.y}px)` }}
    >
      {/* Card + chrome, as a column anchored just above the launcher */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-card"
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ transformOrigin: 'bottom right', width: '420px' }}
            className="absolute bottom-[72px] right-0 flex flex-col gap-1.5 pointer-events-auto"
          >
            {/* The real widget — identical to the live embed */}
            <div
              style={{
                borderRadius: `${cornerRadius}px`,
                // 680px cap is shared with the live embed (see IFRAME_HEIGHT in
                // public/widget.js) so the preview matches it exactly. The larger
                // viewport subtraction just keeps headroom inside the config panel.
                height: 'min(680px, calc(100svh - 170px))',
              }}
              className="overflow-hidden border shadow-2xl bg-white"
            >
              <ChatWindow
                key={activeLang}
                config={publicConfig}
                transport={transport}
                initialLanguage={activeLang}
                onRequestClose={() => setIsOpen(false)}
              />
            </div>

            {/* Preview chrome — Powered by (right-aligned, matching the live widget) */}
            <div className="px-1 text-right">
              <p className="text-[10px] text-muted-foreground/60">
                Powered by{' '}
                <a
                  href={POWERED_BY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-muted-foreground transition-colors"
                >
                  Loqara
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {!isOpen && proactiveEnabled && proactiveMessage && !previewGreetingDismissed && (
          <motion.div
            key="proactive-greeting"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="absolute bottom-[72px] right-0 flex w-[min(280px,calc(100vw-40px))] items-start shadow-lg pointer-events-auto"
            style={{
              backgroundColor: proactiveBackground,
              color: proactiveText,
              borderRadius: `${proactiveRadius}px`,
              fontFamily: proactiveFont,
            }}
            role="status"
          >
            <button
              type="button"
              className="min-h-12 min-w-0 flex-1 cursor-pointer px-4 py-3 text-left text-sm leading-5"
              onClick={() => setIsOpen(true)}
            >
              {proactiveMessage}
            </button>
            <button
              type="button"
              className="flex size-11 shrink-0 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
              onClick={() => setPreviewGreetingDismissed(true)}
              aria-label="Dismiss greeting preview"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
            <span
              className="absolute -bottom-1.5 right-5 size-3 rotate-45"
              style={{ backgroundColor: proactiveBackground }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher bubble — circle or pill, optional company logo + one-shot pulse.
          The launcher is always h-14/w-14 (circle) — the pulse rings are inset-0
          of THIS wrapper so they stay perfectly centered on the button. */}
      <div className="relative pointer-events-auto">
        {/* One-shot pulse: a double wave that plays once then removes itself
            (onAnimationEnd on the trailing ring clears pulseDemo). */}
        {pulseDemo && (
          <>
            <span
              className="pointer-events-none absolute inset-0 -z-10 rounded-full motion-safe:animate-[cbzPulseOnce_1.3s_ease-out_0.2s_1_both]"
              style={{ backgroundColor: launcherColor }}
              aria-hidden="true"
            />
            <span
              className="pointer-events-none absolute inset-0 -z-10 rounded-full motion-safe:animate-[cbzPulseOnce_1.3s_ease-out_0.4s_1_both]"
              style={{ backgroundColor: launcherColor }}
              aria-hidden="true"
              onAnimationEnd={() => setPulseDemo(false)}
            />
          </>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close chat preview' : 'Open chat preview'}
          className={`relative flex h-14 items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            asPill ? 'rounded-full px-5' : 'w-14 overflow-hidden rounded-full'
          } ${pulseDemo ? 'motion-safe:animate-[cbzBreatheOnce_0.9s_ease-in-out_1_both]' : ''}`}
          style={{
            backgroundColor: launcherColor,
            color: config.theme?.launcherIconColor || readableTextColor(launcherColor),
          }}
        >
          {isOpen ? (
            <span
              className="flex items-center justify-center [&_svg]:size-6"
              dangerouslySetInnerHTML={{ __html: closeIconSvg }}
            />
          ) : (
            <>
              {showLauncherLogo ? (
                <img
                  src={launcherAvatar}
                  alt={config.displayName ?? 'Bot'}
                  className={asPill ? 'size-8 rounded-full object-cover' : 'size-full rounded-full object-cover'}
                />
              ) : (
                <span
                  className="flex items-center justify-center [&_svg]:size-7"
                  dangerouslySetInnerHTML={{ __html: launcherIconSvg }}
                />
              )}
              {asPill && (
                <span className="whitespace-nowrap text-[15px] font-semibold">{launcherLabel}</span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------
// Preview transport — same UI, authenticated /api/preview/* backend.
// -------------------------------------------------------------------------
function createPreviewTransport(botId: string, getConfig: () => BotConfig): ChatTransport {
  const JSON_HEADERS = { 'Content-Type': 'application/json' }
  const PREVIEW_CONV = 'preview'

  return {
    async sendChat({ message, language, history }) {
      // Faithfully mirror the server's human-intent escalation (no inbox in
      // preview, but the visitor experience — ack + banner — is identical).
      if (detectHandoffIntent(message, language)) {
        const ack = HANDOFF_ACK[language] ?? HANDOFF_ACK.en
        const body = JSON.stringify({ t: 'text', v: ack }) + '\n'
        return new Response(body, {
          status: 200,
          headers: {
            'content-type': 'application/x-ndjson',
            'x-conversation-id': PREVIEW_CONV,
            'x-handoff': 'requested',
          },
        })
      }
      return fetch('/api/preview/chat', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, config: getConfig(), history, message, language }),
      })
    },

    async search(query, audience) {
      const res = await fetch('/api/preview/search', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, query, audience }),
      })
      return res.json()
    },

    async searchKnowledge(query) {
      const res = await fetch('/api/preview/knowledge', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, query }),
      })
      if (!res.ok) return { answer: '' }
      return (await res.json()) as { answer: string }
    },

    async getProductDetailsByName(productName) {
      const res = await fetch('/api/preview/details', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, productName }),
      })
      if (!res.ok) return { summary: 'Could not fetch the product details right now.' }
      return (await res.json()) as { summary: string }
    },

    async getVoiceToken(language) {
      const res = await fetch('/api/preview/voice-token', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, language }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(
          res.status === 503 ? 'Voice calling unavailable' : (data.error ?? 'Token request failed'),
        )
      }
      const data = (await res.json()) as { token: string; voiceId?: string }
      return { token: data.token, voiceId: data.voiceId }
    },

    // Preview is ephemeral — no persisted ids, so feedback is a no-op.
    async fetchMessages() {
      return []
    },
    async sendFeedback() {},

    // Simulate the handoff so the banner shows what the visitor would see.
    async requestHandoff() {
      return { status: 'requested' }
    },
    async poll() {
      return { status: 'requested', agentName: null, messages: [] }
    },
    async submitLead() {},

    async lookupOrder(orderId, email) {
      const res = await fetch('/api/preview/order', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, orderId, email }),
      })
      if (!res.ok) return { found: false, summary: 'The order lookup is temporarily unavailable.' }
      return res.json()
    },

    async getDiscountInfo() {
      const res = await fetch('/api/preview/discount', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId }),
      })
      if (!res.ok) return { available: false, summary: 'No discount is available right now.' }
      return res.json()
    },
  }
}

// -------------------------------------------------------------------------
// Build the browser-safe PublicBotConfig the widget renders from.
// -------------------------------------------------------------------------
function buildPreviewPublicConfig(config: LiveConfig): PublicBotConfig {
  const languages = (config.languages ?? ['en']) as BotLanguage[]
  const content: PublicBotConfig['content'] = {}
  for (const lang of languages) {
    const c = config.content?.[lang]
    content[lang] = {
      greeting:
        c?.greeting ||
        (lang === 'lt' ? 'Sveiki! Kaip galiu padėti?' : 'Hi! How can I help you today?'),
      suggestedQuestions: (c?.suggestedQuestions ?? []).filter(Boolean),
    }
  }

  const result: PublicBotConfig = {
    displayName: config.displayName || 'Your Bot',
    showLanguageSelector: (config.languages ?? []).length > 1 && (config.showLanguageSelector ?? false),
    tagline: config.tagline,
    theme: {
      primaryColor: config.theme?.primaryColor ?? '#4f46e5',
      position: config.theme?.position ?? 'bottom-right',
      cornerRadius: config.theme?.cornerRadius ?? 16,
      bubbleRadius: config.theme?.bubbleRadius ?? 16,
      fontFamily: config.theme?.fontFamily ?? 'geist',
      showCallButton: config.theme?.showCallButton ?? true,
      showHandoffButton: config.theme?.showHandoffButton ?? true,
      navButtonRadius: config.theme?.navButtonRadius ?? 12,
      backgroundColor: config.theme?.backgroundColor ?? '#ffffff',
      ...(config.theme?.callButtonColor ? { callButtonColor: config.theme.callButtonColor } : {}),
      backgroundImageOpacity: config.theme?.backgroundImageOpacity ?? 100,
      glassBubbles: config.theme?.glassBubbles ?? false,
      bubbleBorderColor: config.theme?.bubbleBorderColor ?? '#e5e7eb',
      bubbleBorderWidth: config.theme?.bubbleBorderWidth ?? 0,
      ...(config.theme?.botBubbleColor ? { botBubbleColor: config.theme.botBubbleColor } : {}),
      ...(config.theme?.bubbleIcon !== undefined && { bubbleIcon: config.theme.bubbleIcon }),
      ...(config.theme?.backgroundImageUrl ? { backgroundImageUrl: config.theme.backgroundImageUrl } : {}),
      ...(config.theme?.sendIconUrl ? { sendIconUrl: config.theme.sendIconUrl } : {}),
      ...(config.theme?.composerFieldColor ? { composerFieldColor: config.theme.composerFieldColor } : {}),
      ...(config.theme?.composerBorderColor ? { composerBorderColor: config.theme.composerBorderColor } : {}),
      ...(config.theme?.sendButtonColor ? { sendButtonColor: config.theme.sendButtonColor } : {}),
    },
    languages,
    defaultLanguage: config.defaultLanguage,
    content,
    proactiveGreeting: {
      enabled: config.proactiveGreeting?.enabled ?? false,
      delaySeconds: config.proactiveGreeting?.delaySeconds ?? 3,
      frequency: config.proactiveGreeting?.frequency ?? 'once_per_session',
      sound: config.proactiveGreeting?.sound ?? 'none',
      messages: (config.proactiveGreeting?.messages?.[config.defaultLanguage ?? languages[0]] ?? [])
        .map((variant) => variant.text?.trim() ?? '')
        .filter(Boolean),
      backgroundColor: config.proactiveGreeting?.backgroundColor ?? '#ffffff',
      textColor: config.proactiveGreeting?.textColor ?? '#111827',
      cornerRadius: config.proactiveGreeting?.cornerRadius ?? 14,
      fontFamily: config.proactiveGreeting?.fontFamily ?? 'inherit',
    },
    leadCapture: {
      enabled: config.leadCapture?.enabled ?? false,
      trigger: config.leadCapture?.trigger ?? 'on_fallback',
      fields: (config.leadCapture?.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required ?? false,
      })),
    },
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? true,
      sttEnabled: config.voice?.sttEnabled ?? true,
    },
  }

  if (config.avatarUrl) result.avatarUrl = config.avatarUrl
  if (config.botAvatarUrl) result.botAvatarUrl = config.botAvatarUrl
  if (config.privacyUrl) result.privacyUrl = config.privacyUrl
  return result
}

// -------------------------------------------------------------------------
// Build a full BotConfig from the partial live form values (for /api/preview/chat).
// -------------------------------------------------------------------------
function buildFullConfig(config: LiveConfig): BotConfig {
  const languages = (config.languages ?? ['en']) as BotConfig['languages']

  const content: BotConfig['content'] = {
    en: {
      greeting: config.content?.en?.greeting ?? 'Hi! How can I help you?',
      suggestedQuestions: config.content?.en?.suggestedQuestions ?? [],
      fallbackMessage:
        config.content?.en?.fallbackMessage ??
        "I'm not sure about that — let me take your details so someone can follow up.",
    },
  }
  if (languages.includes('lt') && config.content?.lt) {
    content.lt = {
      greeting: config.content.lt.greeting ?? 'Sveiki! Kaip galiu padėti?',
      suggestedQuestions: config.content.lt.suggestedQuestions ?? [],
      fallbackMessage: config.content.lt.fallbackMessage ?? 'Atsiprašau, nežinau atsakymo.',
    }
  }

  return {
    displayName: config.displayName ?? 'Bot',
    tagline: config.tagline,
    avatarUrl: config.avatarUrl,
    botAvatarUrl: config.botAvatarUrl,
    privacyUrl: config.privacyUrl,
    theme: {
      primaryColor: config.theme?.primaryColor ?? '#4f46e5',
      position: config.theme?.position ?? 'bottom-right',
      bubbleIcon: config.theme?.bubbleIcon,
      cornerRadius: config.theme?.cornerRadius ?? 16,
      bubbleRadius: config.theme?.bubbleRadius ?? 16,
      fontFamily: config.theme?.fontFamily ?? 'geist',
      showCallButton: config.theme?.showCallButton ?? true,
      showHandoffButton: config.theme?.showHandoffButton ?? true,
      navButtonRadius: config.theme?.navButtonRadius ?? 12,
    },
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? true,
      sttEnabled: config.voice?.sttEnabled ?? true,
      voices: {
        en: (config.voice?.voices as Record<string, string> | undefined)?.en ?? DEFAULT_VOICE_ID,
        lt: (config.voice?.voices as Record<string, string> | undefined)?.lt,
      },
    },
    languages,
    defaultLanguage: config.defaultLanguage,
    content,
    proactiveGreeting: {
      enabled: config.proactiveGreeting?.enabled ?? false,
      delaySeconds: config.proactiveGreeting?.delaySeconds ?? 3,
      frequency: config.proactiveGreeting?.frequency ?? 'once_per_session',
      messages: {
        en: (config.proactiveGreeting?.messages?.en ?? []).map((variant) => ({
          text: variant.text?.trim() ?? '',
        })),
        ...(config.proactiveGreeting?.messages?.lt
          ? {
              lt: config.proactiveGreeting.messages.lt.map((variant) => ({
                text: variant.text?.trim() ?? '',
              })),
            }
          : {}),
      },
      backgroundColor: config.proactiveGreeting?.backgroundColor ?? '#ffffff',
      textColor: config.proactiveGreeting?.textColor ?? '#111827',
      cornerRadius: config.proactiveGreeting?.cornerRadius ?? 14,
      fontFamily: config.proactiveGreeting?.fontFamily ?? 'inherit',
    },
    systemPrompt: config.systemPrompt ?? 'You are a helpful assistant.',
    persona: {
      tone: config.persona?.tone ?? 'friendly',
      verbosity: config.persona?.verbosity ?? 'balanced',
    },
    model: config.model ?? DEFAULT_CHAT_MODEL,
    temperature: config.temperature ?? DEFAULT_TEMPERATURE,
    leadCapture: {
      enabled: config.leadCapture?.enabled ?? false,
      trigger: config.leadCapture?.trigger ?? 'on_fallback',
      afterNMessages: config.leadCapture?.afterNMessages,
      fields: (config.leadCapture?.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required ?? false,
      })),
    },
    allowedDomains: config.allowedDomains ?? [],
    commerce: {
      enabled: config.commerce?.enabled ?? false,
      provider: config.commerce?.provider ?? 'woocommerce',
      storeUrl: config.commerce?.storeUrl ?? '',
      restKey: config.commerce?.restKey,
      restSecret: config.commerce?.restSecret,
      shopifyDomain: config.commerce?.shopifyDomain,
      shopifyToken: config.commerce?.shopifyToken,
      discount: config.commerce?.discount
        ? {
            enabled: config.commerce.discount.enabled ?? false,
            code: config.commerce.discount.code,
            description: config.commerce.discount.description,
          }
        : undefined,
    },
  }
}
