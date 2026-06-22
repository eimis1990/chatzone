'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductListView } from './ProductCards'
import { Composer } from './Composer'
import { VoiceCallButton, type CallState } from '@/components/voice/VoiceCallButton'
import { LeadForm } from './LeadForm'
import { SuggestedQuestions } from './SuggestedQuestions'
import type { PublicBotConfig } from '@/lib/widget-config'
import type { BotLanguage } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { fontStack } from '@/lib/fonts'

interface ChatWindowProps {
  publicKey: string
  config: PublicBotConfig
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

/** Detect visitor's preferred language from browser, falling back to first enabled. */
function detectInitialLanguage(languages: BotLanguage[]): BotLanguage {
  if (languages.length <= 1) return languages[0] ?? 'en'
  try {
    const browserLang = navigator.language.split('-')[0].toLowerCase() as BotLanguage
    if (languages.includes(browserLang)) return browserLang
  } catch {
    // navigator.language unavailable (e.g. SSR)
  }
  return languages[0]
}

const LANG_LABELS: Record<BotLanguage, string> = {
  en: 'EN',
  lt: 'LT',
}

// Header status while a live call is active.
const VOICE_STATUS: Record<'en' | 'lt', Record<'connecting' | 'listening' | 'speaking', string>> = {
  en: { connecting: 'Connecting…', listening: 'Listening…', speaking: 'Speaking…' },
  lt: { connecting: 'Jungiamasi…', listening: 'Klausosi…', speaking: 'Kalba…' },
}

export function ChatWindow({ publicKey, config }: ChatWindowProps) {
  const languages = config.languages ?? ['en']
  const isMultilang = languages.length > 1

  // Active language — initialized once from browser locale
  const [activeLang, setActiveLang] = useState<BotLanguage>(() =>
    detectInitialLanguage(languages),
  )

  // Derived per-language content
  const langContent = config.content[activeLang] ?? config.content[languages[0]] ?? { greeting: '', suggestedQuestions: [] }
  const greeting = langContent.greeting
  const suggestedQuestions = langContent.suggestedQuestions ?? []

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadDismissed, setLeadDismissed] = useState(false)
  const [suggestedVisible, setSuggestedVisible] = useState(true)
  // When set, the full-height product list overlay covers the chat body.
  const [listProducts, setListProducts] = useState<CommerceProduct[] | null>(null)
  // Live-call state, surfaced in the header.
  const [callState, setCallState] = useState<CallState>('idle')
  const callStateRef = useRef<CallState>('idle')
  const endVoiceRef = useRef<(() => void) | null>(null)
  const visitorIdRef = useRef<string>('')

  const handleCallState = useCallback((s: CallState) => {
    callStateRef.current = s
    setCallState(s)
  }, [])

  // Voice utterances (visitor + agent) flow into the chat transcript. The agent
  // wraps replies in language tags (<Lithuanian>…</Lithuanian>) for TTS — strip
  // them for display.
  const handleVoiceTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    const clean = text.replace(/<\/?[A-Za-z][\w-]*>/g, '').trim()
    if (!clean) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === role && last.content === clean) return prev
      return [...prev, { id: generateId(), role, content: clean }]
    })
  }, [])

  const handleVoiceReady = useCallback((c: { end: () => void }) => {
    endVoiceRef.current = c.end
  }, [])

  // The agent's `search_products` client tool: fetch products, show them as cards
  // in the chat, and return a short summary for the agent to speak.
  const handleVoiceSearch = useCallback(
    async (query: string): Promise<string> => {
      try {
        const res = await fetch('/api/widget/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey, query }),
        })
        const data = (await res.json()) as { products?: CommerceProduct[]; summary?: string }
        if (data.products?.length) {
          setMessages((prev) => [
            ...prev,
            { id: generateId(), role: 'assistant', content: '', products: data.products },
          ])
        }
        return data.summary ?? 'Here are a few options.'
      } catch {
        return 'The product search is temporarily unavailable.'
      }
    },
    [publicKey],
  )
  const primaryColor = config.theme.primaryColor
  const cornerRadius = config.theme.cornerRadius ?? 16
  const bubbleRadius = config.theme.bubbleRadius ?? 16

  // Restore/generate visitorId from localStorage on mount
  useEffect(() => {
    const key = 'cbz_visitor_id'
    let id = ''
    try {
      id = localStorage.getItem(key) ?? ''
      if (!id) {
        id = crypto.randomUUID()
        localStorage.setItem(key, id)
      }
    } catch {
      id = crypto.randomUUID()
    }
    visitorIdRef.current = id
  }, [])

  // When language changes: reset greeting-seeded messages and suggested visibility.
  // Preserve conversation id and lead form state (server-side handles multilang).
  const prevLangRef = useRef(activeLang)
  useEffect(() => {
    if (prevLangRef.current === activeLang) return
    prevLangRef.current = activeLang
    setMessages([])
    setSuggestedVisible(true)
    setListProducts(null)
  }, [activeLang])

  /**
   * After a full chat turn, fetch the real DB message ids for the conversation
   * so the TTS button can use them.
   */
  const syncMessageIds = useCallback(
    async (convId: string) => {
      // Map our client-side assistant message ids to the real DB ids (by content)
      // so TTS and 👍/👎 feedback can target the persisted message.
      try {
        const res = await fetch(
          `/api/messages?publicKey=${encodeURIComponent(publicKey)}&conversationId=${encodeURIComponent(convId)}`,
        )
        if (!res.ok) return
        const data = (await res.json()) as { messages?: { id: string; role: string; content: string }[] }
        if (!data.messages) return

        setMessages((prev) => {
          const serverAssistant = data.messages!.filter((m) => m.role === 'assistant')
          return prev.map((m) => {
            if (m.role !== 'assistant') return m
            const match = serverAssistant.find((s) => s.content === m.content)
            if (match && match.id !== m.id) return { ...m, id: match.id }
            return m
          })
        })
      } catch {
        // Non-critical
      }
    },
    [publicKey],
  )

  const handleFeedback = useCallback(
    async (messageId: string, value: 'up' | 'down') => {
      try {
        await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicKey, messageId, value }),
        })
      } catch {
        // Non-critical
      }
    },
    [publicKey],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return

      // If a live call is in progress, typing ends it and drops back to text chat.
      if (callStateRef.current !== 'idle') {
        endVoiceRef.current?.()
      }

      setSuggestedVisible(false)

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text }
      const assistantMsg: ChatMessage = { id: generateId(), role: 'assistant', content: '', streaming: true }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey,
            visitorId: visitorIdRef.current,
            conversationId,
            message: text,
            language: activeLang,
          }),
        })

        const convId = res.headers.get('x-conversation-id')
        if (convId) setConversationId(convId)

        const leadCapture = res.headers.get('x-lead-capture')
        if (leadCapture === '1' && !leadDismissed && config.leadCapture.enabled) {
          setShowLeadForm(true)
        }

        if (!res.ok || !res.body) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
                : m
            )
          )
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        // NDJSON line buffer — a network chunk may contain partial lines
        let lineBuffer = ''
        let accumulatedText = ''
        let accumulatedProducts: CommerceProduct[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          lineBuffer += decoder.decode(value, { stream: true })
          const lines = lineBuffer.split('\n')
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
                      : m
                  )
                )
              } else if (event.t === 'products' && Array.isArray(event.v)) {
                accumulatedProducts = event.v as CommerceProduct[]
              }
            } catch {
              // Malformed NDJSON line — skip
            }
          }
        }
        // Process any remaining buffered bytes
        if (lineBuffer.trim()) {
          try {
            const event = JSON.parse(lineBuffer.trim()) as { t: string; v: unknown }
            if (event.t === 'text' && typeof event.v === 'string') {
              accumulatedText += event.v
            } else if (event.t === 'products' && Array.isArray(event.v)) {
              accumulatedProducts = event.v as CommerceProduct[]
            }
          } catch {
            // skip
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
              : m
          )
        )

        if (convId) {
          await syncMessageIds(convId)
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
              : m
          )
        )
      } finally {
        setStreaming(false)
      }
    },
    [streaming, conversationId, leadDismissed, config.leadCapture.enabled, publicKey, activeLang, syncMessageIds]
  )

  const handleLeadSubmit = useCallback(
    async (fields: Record<string, string>) => {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, conversationId, fields }),
      }).then(async (r) => {
        if (!r.ok) throw new Error('Lead submission failed')
      })
    },
    [publicKey, conversationId]
  )

  const getVoiceToken = useCallback(async (): Promise<{ token: string; voiceId?: string }> => {
    const res = await fetch('/api/widget/voice-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey, language: activeLang }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(
        res.status === 503 ? 'Voice calling unavailable' : (data.error ?? 'Token request failed'),
      )
    }
    const data = (await res.json()) as { token: string; voiceId?: string }
    return { token: data.token, voiceId: data.voiceId }
  }, [publicKey, activeLang])

  const voiceEnabled = Boolean(config.voice?.enabled)
  const headerBorderRadius = `${cornerRadius}px ${cornerRadius}px 0 0`

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      style={{ borderRadius: `${cornerRadius}px`, fontFamily: fontStack(config.theme.fontFamily) }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
        style={{ backgroundColor: primaryColor, borderRadius: headerBorderRadius }}
      >
        {config.avatarUrl ? (
          <img
            src={config.avatarUrl}
            alt={config.displayName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold flex-shrink-0"
            aria-hidden="true"
          >
            {config.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-sm flex-1 truncate">{config.displayName}</span>

        {/* Language switcher — only when multiple languages are enabled */}
        {isMultilang && (
          <div className="flex items-center gap-0.5 bg-white/10 rounded-md p-0.5" role="group" aria-label="Language switcher">
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLang(lang)}
                aria-pressed={lang === activeLang}
                className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                  lang === activeLang
                    ? 'bg-white text-current font-semibold'
                    : 'text-white/70 hover:text-white'
                }`}
                style={lang === activeLang ? { color: primaryColor } : {}}
              >
                {LANG_LABELS[lang] ?? lang.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <span className="flex items-center gap-1 text-xs opacity-80 ml-1" aria-live="polite">
          {callState === 'idle' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" aria-hidden="true" />
              {activeLang === 'lt' ? 'Prisijungęs' : 'Online'}
            </>
          ) : (
            <>
              <span
                className={`w-1.5 h-1.5 rounded-full bg-white inline-block ${
                  callState === 'speaking' ? 'animate-pulse' : ''
                }`}
                aria-hidden="true"
              />
              {callState === 'connecting'
                ? VOICE_STATUS[activeLang].connecting
                : VOICE_STATUS[activeLang][callState]}
            </>
          )}
        </span>

        {/* Voice call button — in the header, only when voice is enabled */}
        {voiceEnabled && (
          <VoiceCallButton
            appearance="compact"
            getToken={getVoiceToken}
            primaryColor="#ffffff"
            language={activeLang}
            onStateChange={handleCallState}
            onTranscript={handleVoiceTranscript}
            onReady={handleVoiceReady}
            onSearch={handleVoiceSearch}
            className="flex-shrink-0 ml-1"
          />
        )}
      </div>

      {/* Body — messages + composer. Relative so the product list can overlay it. */}
      <div className="relative flex-1 flex flex-col min-h-0">
        <MessageList
          messages={messages}
          primaryColor={primaryColor}
          bubbleRadius={bubbleRadius}
          greeting={greeting}
          displayName={config.displayName}
          avatarUrl={config.avatarUrl}
          activeLang={activeLang}
          onSeeAllProducts={setListProducts}
          onFeedback={handleFeedback}
        />

        {/* Suggested Questions — pinned just above input, visible until first message */}
        {suggestedVisible && suggestedQuestions.length > 0 && (
          <SuggestedQuestions
            questions={suggestedQuestions}
            primaryColor={primaryColor}
            onSelect={sendMessage}
            disabled={streaming}
          />
        )}

        {/* Lead Form */}
        {showLeadForm && !leadDismissed && config.leadCapture.fields.length > 0 && (
          <LeadForm
            fields={config.leadCapture.fields}
            primaryColor={primaryColor}
            onSubmit={handleLeadSubmit}
            onDismiss={() => {
              setShowLeadForm(false)
              setLeadDismissed(true)
            }}
          />
        )}

        {/* Composer */}
        <Composer
          onSend={sendMessage}
          disabled={streaming}
          primaryColor={primaryColor}
          language={activeLang}
        />

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
    </div>
  )
}
