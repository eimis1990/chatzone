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

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircleIcon, XIcon } from 'lucide-react'
import { ChatWindow } from '@/components/widget/ChatWindow'
import { DEFAULT_CHAT_MODEL, DEFAULT_TEMPERATURE } from '@/lib/ai/chat-models'
import { detectHandoffIntent, HANDOFF_ACK } from '@/lib/handoff'
import type { ChatTransport } from '@/lib/widget-transport'
import type { PublicBotConfig } from '@/lib/widget-config'
import type { BotConfig, BotLanguage, SuggestedQuestion } from '@/lib/types'
import { POWERED_BY_URL, readableTextColor } from '@/lib/utils'

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
  const [isOpen, setIsOpen] = useState(true)

  // Always read the latest config inside the (stable) transport.
  const configRef = useRef(config)
  configRef.current = config

  const publicConfig = buildPreviewPublicConfig(config)
  const cornerRadius = config.theme?.cornerRadius ?? 16
  const primaryColor = config.theme?.primaryColor ?? '#4f46e5'
  const launcherAvatar = config.avatarUrl || config.botAvatarUrl
  const launcherColor = config.theme?.launcherColor || primaryColor
  const launcherStyleCfg = config.theme?.launcherStyle ?? 'circle'
  const launcherLabel = config.theme?.launcherLabel ?? ''
  const showLauncherLogo = (config.theme?.launcherShowLogo ?? false) && !!launcherAvatar
  const asPill = launcherStyleCfg === 'pill' && !!launcherLabel && !isOpen
  const pulse = (config.theme?.launcherPulse ?? false) && launcherStyleCfg === 'circle' && !isOpen

  const transport = useMemo<ChatTransport>(
    () => createPreviewTransport(botId, () => buildFullConfig(configRef.current)),
    [botId],
  )

  return (
    <div className="relative pointer-events-none select-none">
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

      {/* Launcher bubble — circle or pill, optional company logo + pulse */}
      <div className="relative pointer-events-auto">
        {/* Pulse rings — two expanding, fading circles behind the button */}
        {pulse && (
          <>
            <span
              className="absolute inset-0 -z-10 rounded-full motion-safe:animate-[cbzPulse_6s_ease-out_infinite_backwards]"
              style={{ backgroundColor: launcherColor }}
              aria-hidden="true"
            />
            <span
              className="absolute inset-0 -z-10 rounded-full motion-safe:animate-[cbzPulse_6s_ease-out_0.25s_infinite_backwards]"
              style={{ backgroundColor: launcherColor }}
              aria-hidden="true"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Close chat preview' : 'Open chat preview'}
          className={`relative flex h-14 items-center justify-center gap-2 shadow-lg transition-transform hover:scale-105 active:scale-95 ${
            asPill ? 'rounded-full px-5' : 'w-14 overflow-hidden rounded-full'
          } ${pulse ? 'motion-safe:animate-[cbzBreathe_6s_ease-in-out_infinite]' : ''}`}
          style={{ backgroundColor: launcherColor, color: readableTextColor(launcherColor) }}
        >
          {isOpen ? (
            <XIcon className="size-6" aria-hidden="true" />
          ) : (
            <>
              {showLauncherLogo ? (
                <img
                  src={launcherAvatar}
                  alt={config.displayName ?? 'Bot'}
                  className={asPill ? 'size-8 rounded-full object-cover' : 'size-full rounded-full object-cover'}
                />
              ) : (
                <MessageCircleIcon className="size-7" aria-hidden="true" />
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
    },
    languages,
    defaultLanguage: config.defaultLanguage,
    content,
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
