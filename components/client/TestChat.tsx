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
import { MessageCircleIcon, XIcon, RotateCcwIcon } from 'lucide-react'
import { ChatWindow } from '@/components/widget/ChatWindow'
import { detectHandoffIntent, HANDOFF_ACK } from '@/lib/handoff'
import type { ChatTransport } from '@/lib/widget-transport'
import type { PublicBotConfig } from '@/lib/widget-config'
import type { BotConfig, BotLanguage } from '@/lib/types'
import { POWERED_BY_URL } from '@/lib/utils'

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'

// Partial form values — fields may be undefined mid-edit.
type LiveConfig = {
  displayName?: string
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
  content?: Partial<
    Record<BotLanguage, { greeting?: string; suggestedQuestions?: string[]; fallbackMessage?: string }>
  >
  commerce?: { enabled?: boolean; provider?: 'woocommerce'; storeUrl?: string }
}

interface TestChatProps {
  botId: string
  config: LiveConfig
  activeLang: BotLanguage
}

export function TestChat({ botId, config, activeLang }: TestChatProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [resetKey, setResetKey] = useState(0)

  // Always read the latest config inside the (stable) transport.
  const configRef = useRef(config)
  configRef.current = config

  const publicConfig = buildPreviewPublicConfig(config)
  const cornerRadius = config.theme?.cornerRadius ?? 16
  const primaryColor = config.theme?.primaryColor ?? '#4f46e5'
  const launcherAvatar = config.botAvatarUrl || config.avatarUrl

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
                height: '720px',
                maxHeight: 'calc(100svh - 220px)',
              }}
              className="overflow-hidden border shadow-2xl bg-white"
            >
              <ChatWindow
                key={`${activeLang}:${resetKey}`}
                config={publicConfig}
                transport={transport}
                initialLanguage={activeLang}
                headerAction={
                  <button
                    type="button"
                    onClick={() => setResetKey((k) => k + 1)}
                    title="Start over"
                    aria-label="Start over — clear test conversation"
                    className="flex size-8 flex-shrink-0 items-center justify-center rounded-lg text-current transition hover:brightness-90"
                    style={{ backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)' }}
                  >
                    <RotateCcwIcon className="size-4" aria-hidden="true" />
                  </button>
                }
              />
            </div>

            {/* Preview chrome — Powered by */}
            <div className="px-1">
              <p className="text-[10px] text-muted-foreground/60">
                Powered by{' '}
                <a
                  href={POWERED_BY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-muted-foreground transition-colors"
                >
                  Chatzone
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Launcher bubble */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close chat preview' : 'Open chat preview'}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 pointer-events-auto overflow-hidden"
        style={{ backgroundColor: primaryColor }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <XIcon className="size-6 text-white" aria-hidden="true" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {launcherAvatar ? (
                <img
                  src={launcherAvatar}
                  alt={config.displayName ?? 'Bot'}
                  className="w-14 h-14 object-cover rounded-full"
                />
              ) : (
                <MessageCircleIcon className="size-7 text-white" aria-hidden="true" />
              )}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
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

    async search(query) {
      const res = await fetch('/api/preview/search', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ botId, query }),
      })
      return res.json()
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
    theme: {
      primaryColor: config.theme?.primaryColor ?? '#4f46e5',
      position: config.theme?.position ?? 'bottom-right',
      cornerRadius: config.theme?.cornerRadius ?? 16,
      bubbleRadius: config.theme?.bubbleRadius ?? 16,
      fontFamily: config.theme?.fontFamily ?? 'geist',
      ...(config.theme?.bubbleIcon !== undefined && { bubbleIcon: config.theme.bubbleIcon }),
    },
    languages,
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
    content,
    systemPrompt: config.systemPrompt ?? 'You are a helpful assistant.',
    persona: {
      tone: config.persona?.tone ?? 'friendly',
      verbosity: config.persona?.verbosity ?? 'balanced',
    },
    model: config.model ?? 'gpt-4o-mini',
    temperature: config.temperature ?? 0.3,
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
      provider: 'woocommerce',
      storeUrl: config.commerce?.storeUrl ?? '',
    },
  }
}
