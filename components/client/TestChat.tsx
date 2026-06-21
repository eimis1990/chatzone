'use client'

/**
 * TestChat — Interactive preview playground for the bot configurator.
 *
 * Renders as a floating chat widget (launcher bubble + open/close card) docked
 * to the bottom-right of the preview panel, matching the deployed widget appearance.
 *
 * Features:
 *  - Floating launcher bubble with open/close toggle
 *  - Streams bot replies from POST /api/preview/chat
 *  - TTS (🔊) per bot message via POST /api/preview/tts when voice.ttsEnabled
 *  - Live voice call via ElevenLabs WebRTC (VoiceCallButton) in composer
 *  - Suggested question chips pinned above input, hidden after first message
 *  - Start over button restores suggested questions
 *  - Live theming from config.theme (primaryColor, cornerRadius, bubbleRadius)
 *  - Avatar from config.avatarUrl (falls back to BotIcon)
 *  - "Powered by Chatzone" footer link below the card
 *  - Active language (activeLang) drives which content.<lang> is shown
 */

import { useState, useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BotIcon,
  RotateCcwIcon,
  LoaderCircleIcon,
  SendIcon,
  MessageCircleIcon,
  XIcon,
} from 'lucide-react'
import type { BotConfig, BotLanguage } from '@/lib/types'
import { VoiceCallButton, type CallState } from '@/components/voice/VoiceCallButton'
import { POWERED_BY_URL } from '@/lib/utils'
import { ProductCards, ProductListView } from '@/components/widget/ProductCards'
import type { CommerceProduct } from '@/lib/commerce/types'
import { fontStack } from '@/lib/fonts'

// Header subtitle labels while a live call is active.
const VOICE_STATUS: Record<'en' | 'lt', Record<'connecting' | 'listening' | 'speaking', string>> = {
  en: { connecting: 'Connecting…', listening: 'Listening…', speaking: 'Speaking…' },
  lt: { connecting: 'Jungiamasi…', listening: 'Klausosi…', speaking: 'Kalba…' },
}

// Partial form values — fields may be undefined mid-edit.
// voice.voices is kept as a loose Record to accommodate RHF partial types (en may be undefined).
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
  languages?: BotLanguage[]
  content?: Partial<Record<BotLanguage, {
    greeting?: string
    suggestedQuestions?: string[]
    fallbackMessage?: string
  }>>
  commerce?: { enabled?: boolean; provider?: 'woocommerce'; storeUrl?: string }
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  products?: CommerceProduct[]
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

interface TestChatProps {
  botId: string
  config: LiveConfig
  activeLang: BotLanguage
}

export function TestChat({ botId, config, activeLang }: TestChatProps) {
  const primaryColor = config.theme?.primaryColor ?? '#4f46e5'
  const cornerRadius = config.theme?.cornerRadius ?? 16
  const bubbleRadius = config.theme?.bubbleRadius ?? 16
  const chatFont = fontStack(config.theme?.fontFamily)
  const displayName = config.displayName || 'Your Bot'
  const avatarUrl = config.avatarUrl

  // Per-language content
  const langContent = config.content?.[activeLang]
  const greeting = langContent?.greeting || (activeLang === 'lt' ? 'Sveiki! Kaip galiu padėti?' : 'Hi! How can I help you today?')
  const suggestedQuestions = (langContent?.suggestedQuestions ?? []).filter(Boolean)
  const inputPlaceholder = activeLang === 'lt' ? 'Rašykite žinutę…' : 'Type a message…'

  const voiceEnabled = config.voice?.enabled ?? false

  // Open/closed state
  const [isOpen, setIsOpen] = useState(true)

  // Message state — starts with just the greeting
  const greetingMsg: ChatMessage = { id: 'greeting', role: 'assistant', content: greeting }
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMsg])
  const [streaming, setStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestedVisible, setSuggestedVisible] = useState(true)
  // When set, the full-height product list overlay covers the chat body.
  const [listProducts, setListProducts] = useState<CommerceProduct[] | null>(null)
  // Live-call state, surfaced in the header subtitle.
  const [callState, setCallState] = useState<CallState>('idle')

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Re-initialize when greeting changes (language switch or config change)
  const prevGreetingRef = useRef(greeting)
  if (prevGreetingRef.current !== greeting) {
    prevGreetingRef.current = greeting
    // Reset on greeting change — update the greeting message without full reset
    setMessages([{ id: 'greeting', role: 'assistant', content: greeting }])
    setSuggestedVisible(true)
  }

  // -------------------------------------------------------------------------
  // Scroll to bottom on new messages
  // -------------------------------------------------------------------------
  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // -------------------------------------------------------------------------
  // Send a message
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming || !text.trim()) return
      setSuggestedVisible(false)

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text.trim() }
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        streaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)
      setInputValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      // Build history from current messages (exclude the greeting from history)
      const history = messages
        .filter((m) => m.id !== 'greeting' && !m.streaming)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Build a full BotConfig from the live partial config (fill in defaults)
      const fullConfig = buildFullConfig(config)

      try {
        const res = await fetch('/api/preview/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId,
            config: fullConfig,
            history,
            message: text.trim(),
            language: activeLang,
          }),
        })

        if (!res.ok || !res.body) {
          const errorText = 'Sorry, something went wrong. Please try again.'
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: errorText, streaming: false } : m,
            ),
          )
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        // Buffer for partial NDJSON lines across network chunks
        let lineBuffer = ''
        let accumulatedText = ''
        let accumulatedProducts: CommerceProduct[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          lineBuffer += decoder.decode(value, { stream: true })
          // Split on newlines; the last element may be a partial line
          const lines = lineBuffer.split('\n')
          // Keep the trailing partial line for the next iteration
          lineBuffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue
            try {
              const event = JSON.parse(trimmed) as { t: string; v: unknown }
              if (event.t === 'text' && typeof event.v === 'string') {
                accumulatedText += event.v
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: accumulatedText, streaming: true }
                      : m,
                  ),
                )
                scrollBottom()
              } else if (event.t === 'products' && Array.isArray(event.v)) {
                accumulatedProducts = event.v as CommerceProduct[]
              }
            } catch {
              // Malformed line — skip
            }
          }
        }
        // Process any remaining buffered line
        if (lineBuffer.trim()) {
          try {
            const event = JSON.parse(lineBuffer.trim()) as { t: string; v: unknown }
            if (event.t === 'text' && typeof event.v === 'string') {
              accumulatedText += event.v
            } else if (event.t === 'products' && Array.isArray(event.v)) {
              accumulatedProducts = event.v as CommerceProduct[]
            }
          } catch {
            // Malformed trailing line — skip
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  content: accumulatedText,
                  streaming: false,
                  products: accumulatedProducts.length > 0 ? accumulatedProducts : undefined,
                }
              : m,
          ),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
              : m,
          ),
        )
      } finally {
        setStreaming(false)
        scrollBottom()
      }
    },
    [streaming, messages, botId, config, activeLang, scrollBottom],
  )

  // -------------------------------------------------------------------------
  // Start over
  // -------------------------------------------------------------------------
  const handleStartOver = useCallback(() => {
    setMessages([{ id: 'greeting', role: 'assistant', content: greeting }])
    setSuggestedVisible(true)
    setInputValue('')
    setListProducts(null)
  }, [greeting])

  // -------------------------------------------------------------------------
  // Form submit / keyboard
  // -------------------------------------------------------------------------
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // -------------------------------------------------------------------------
  // Avatar helper
  // -------------------------------------------------------------------------
  const renderAvatar = (size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'md' ? 'w-10 h-10' : 'w-7 h-7'
    return (
      <div
        className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden`}
        style={{ backgroundColor: avatarUrl ? 'transparent' : primaryColor }}
        aria-hidden="true"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <BotIcon className={size === 'md' ? 'size-5' : 'size-3.5'} />
        )}
      </div>
    )
  }

  const msgBubbleRadius = `${bubbleRadius}px`

  // -------------------------------------------------------------------------
  // The preview panel: floating bottom-right widget (fixed overlay)
  // -------------------------------------------------------------------------
  return (
    <div className="relative pointer-events-none select-none">
      {/* Chat Card — floats above the launcher bubble */}
      <AnimatePresence>
        {isOpen && (
        <motion.div
          key="chat-card"
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            transformOrigin: 'bottom right',
            borderRadius: `${cornerRadius}px`,
            height: '630px',
            width: '420px',
            fontFamily: chatFont,
          }}
          className="absolute bottom-[72px] right-0 flex flex-col bg-background border shadow-2xl pointer-events-auto overflow-hidden"
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
            style={{
              backgroundColor: primaryColor,
              borderRadius: `${cornerRadius}px ${cornerRadius}px 0 0`,
            }}
          >
            <div
              className="flex size-8 items-center justify-center rounded-full overflow-hidden flex-shrink-0"
              style={{ backgroundColor: avatarUrl ? 'transparent' : 'rgba(255,255,255,0.2)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <BotIcon className="size-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{displayName}</p>
              <p className="text-xs opacity-80 flex items-center gap-1.5">
                {callState === 'idle' ? (
                  activeLang === 'lt' ? 'Prisijungęs' : 'Online'
                ) : (
                  <>
                    <span
                      className={`inline-block size-1.5 rounded-full bg-current ${
                        callState === 'speaking' ? 'animate-pulse' : ''
                      }`}
                      aria-hidden="true"
                    />
                    {VOICE_STATUS[activeLang][callState]}
                  </>
                )}
              </p>
            </div>

            {/* Call + restart controls */}
            {voiceEnabled && (
              <VoiceCallButton
                appearance="compact"
                primaryColor="#ffffff"
                language={activeLang}
                onStateChange={setCallState}
                className="flex-shrink-0"
                getToken={async () => {
                  const res = await fetch('/api/preview/voice-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ botId }),
                  })
                  if (!res.ok) {
                    const data = (await res.json().catch(() => ({}))) as { error?: string }
                    throw new Error(
                      res.status === 503
                        ? 'Voice calling unavailable'
                        : (data.error ?? 'Token request failed'),
                    )
                  }
                  const data = (await res.json()) as { token: string }
                  return data.token
                }}
              />
            )}

            <button
              type="button"
              onClick={handleStartOver}
              title="Start over"
              aria-label="Start over — clear test conversation"
              className="flex items-center justify-center size-8 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white"
            >
              <RotateCcwIcon className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* Body — messages + composer; relative so the product list can overlay it. */}
          <div className="relative flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
            role="log"
            aria-live="polite"
            aria-label="Test conversation"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && renderAvatar()}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'text-white'
                        : 'bg-muted text-foreground'
                    }`}
                    style={{
                      borderRadius: msg.role === 'user'
                        ? `${msgBubbleRadius} ${msgBubbleRadius} 2px ${msgBubbleRadius}`
                        : `${msgBubbleRadius} ${msgBubbleRadius} ${msgBubbleRadius} 2px`,
                      ...(msg.role === 'user' ? { backgroundColor: primaryColor } : {}),
                    }}
                  >
                    {msg.content}
                    {msg.streaming && (
                      <span
                        className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-current opacity-70"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Product cards — rendered under completed assistant messages */}
                  {msg.role === 'assistant' &&
                    !msg.streaming &&
                    msg.products &&
                    msg.products.length > 0 && (
                      <ProductCards
                        products={msg.products}
                        bubbleRadius={bubbleRadius}
                        primaryColor={primaryColor}
                        language={activeLang}
                        onSeeAll={setListProducts}
                      />
                    )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions */}
          {suggestedVisible && suggestedQuestions.length > 0 && (
            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5">
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={streaming}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-50 text-left leading-normal"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="border-t p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder={inputPlaceholder}
                disabled={streaming}
                rows={1}
                aria-label="Test message input"
                className="flex-1 resize-none rounded-lg border border-input px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-1 disabled:opacity-50 overflow-hidden bg-background"
                style={{ maxHeight: '120px' }}
              />

              <button
                type="submit"
                disabled={streaming || !inputValue.trim()}
                aria-label="Send message"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {streaming ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </form>
          </div>

          {/* Full-height product list overlay (covers messages + composer) */}
          <AnimatePresence>
            {listProducts && (
              <ProductListView
                products={listProducts}
                bubbleRadius={bubbleRadius}
                primaryColor={primaryColor}
                language={activeLang}
                onClose={() => setListProducts(null)}
              />
            )}
          </AnimatePresence>
          </div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Powered by — below the card, bottom-left (close button is bottom-right) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="powered-by"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-[52px] right-0 w-[420px] text-left pl-1 pointer-events-auto"
          >
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
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-14 h-14 object-cover rounded-full" />
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
// Helper: build a full BotConfig from the partial live form values
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
    theme: {
      primaryColor: config.theme?.primaryColor ?? '#4f46e5',
      position: config.theme?.position ?? 'bottom-right',
      bubbleIcon: config.theme?.bubbleIcon,
      cornerRadius: config.theme?.cornerRadius ?? 16,
      bubbleRadius: config.theme?.bubbleRadius ?? 16,
    },
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? true,
      sttEnabled: config.voice?.sttEnabled ?? true,
      voices: {
        en: (config.voice?.voices as Record<string, string> | undefined)?.en ?? '21m00Tcm4TlvDq8ikWAM',
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
