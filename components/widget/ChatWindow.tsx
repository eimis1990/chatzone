'use client'

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { HeadsetIcon } from 'lucide-react'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductListView } from './ProductCards'
import { Composer } from './Composer'
import { VoiceCallButton, type CallState } from '@/components/voice/VoiceCallButton'
import { LeadForm } from './LeadForm'
import { SuggestedQuestions } from './SuggestedQuestions'
import type { PublicBotConfig } from '@/lib/widget-config'
import type { ChatTransport } from '@/lib/widget-transport'
import type { BotLanguage, HandoffStatus } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { fontStack } from '@/lib/fonts'
import { readableTextColor, isLightColor } from '@/lib/utils'

interface ChatWindowProps {
  config: PublicBotConfig
  transport: ChatTransport
  /** Display language, fixed by configuration (defaults to the first enabled). */
  initialLanguage?: BotLanguage
  /** Optional extra control rendered at the right of the header (e.g. preview "Start over"). */
  headerAction?: ReactNode
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

// Header status while a live call is active.
const VOICE_STATUS: Record<'en' | 'lt', Record<'connecting' | 'listening' | 'speaking', string>> = {
  en: { connecting: 'Connecting…', listening: 'Listening…', speaking: 'Speaking…' },
  lt: { connecting: 'Jungiamasi…', listening: 'Klausosi…', speaking: 'Kalba…' },
}

// Human-handoff copy.
const HANDOFF_TALK_LABEL: Record<BotLanguage, string> = {
  en: 'Talk to a person',
  lt: 'Kalbėti su žmogumi',
}
// Phrase sent when escalating before a conversation exists — must contain a
// keyword detected by lib/handoff.ts detectHandoffIntent.
const HANDOFF_REQUEST_PHRASE: Record<BotLanguage, string> = {
  en: 'I would like to talk to a person.',
  lt: 'Norėčiau pasikalbėti su žmogumi.',
}
const HANDOFF_BANNER_REQUESTED: Record<BotLanguage, string> = {
  en: 'Connecting you with a team member…',
  lt: 'Jungiame jus su komandos nariu…',
}
const HANDOFF_ENDED_NOTE: Record<BotLanguage, string> = {
  en: 'The chat with our team member has ended. You can keep chatting with the assistant.',
  lt: 'Pokalbis su komandos nariu baigtas. Galite toliau bendrauti su asistentu.',
}
function handoffBannerLive(lang: BotLanguage, agentName: string | null): string {
  const who = agentName?.trim() || (lang === 'lt' ? 'komandos nariu' : 'a team member')
  return lang === 'lt' ? `Bendraujate su ${who}` : `You're chatting with ${who}`
}

const POLL_INTERVAL_MS = 4000

export function ChatWindow({ config, transport, initialLanguage, headerAction }: ChatWindowProps) {
  const languages = config.languages ?? ['en']

  // Display language is fixed by configuration; visitors can't switch it.
  const activeLang: BotLanguage =
    initialLanguage && languages.includes(initialLanguage) ? initialLanguage : languages[0] ?? 'en'

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
  // Latest messages, for building request history without re-creating callbacks.
  const messagesRef = useRef<ChatMessage[]>([])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Prior turns sent to the (stateless) chat transport.
  const buildHistory = useCallback(
    () =>
      messagesRef.current
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content && !m.streaming)
        .map((m) => ({ role: m.role, content: m.content })),
    [],
  )

  // Human-handoff state.
  const [handoffStatus, setHandoffStatus] = useState<HandoffStatus>('bot')
  const [agentName, setAgentName] = useState<string | null>(null)
  const handoffStatusRef = useRef<HandoffStatus>('bot')
  const lastPollTsRef = useRef<string | undefined>(undefined)

  const updateHandoff = useCallback((s: HandoffStatus) => {
    handoffStatusRef.current = s
    setHandoffStatus(s)
  }, [])

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
        const data = await transport.search(query)
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
    [transport],
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

  /**
   * After a full chat turn, fetch the real DB message ids for the conversation
   * so feedback (👍/👎) can target the persisted message.
   */
  const syncMessageIds = useCallback(
    async (convId: string) => {
      try {
        const serverMessages = await transport.fetchMessages(convId)
        if (!serverMessages.length) return
        setMessages((prev) => {
          const serverAssistant = serverMessages.filter((m) => m.role === 'assistant')
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
    [transport],
  )

  const handleFeedback = useCallback(
    async (messageId: string, value: 'up' | 'down') => {
      try {
        await transport.sendFeedback(messageId, value)
      } catch {
        // Non-critical
      }
    },
    [transport],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return

      // If a live call is in progress, typing ends it and drops back to text chat.
      if (callStateRef.current !== 'idle') {
        endVoiceRef.current?.()
      }

      setSuggestedVisible(false)

      // While a human is handling, the visitor's message is stored but the bot
      // does not reply — the agent answers from the inbox (surfaced via polling).
      if (handoffStatusRef.current === 'requested' || handoffStatusRef.current === 'live') {
        const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text }
        const history = buildHistory()
        setMessages((prev) => [...prev, userMsg])
        try {
          const res = await transport.sendChat({
            message: text,
            conversationId,
            language: activeLang,
            visitorId: visitorIdRef.current,
            history,
          })
          const cid = res.headers.get('x-conversation-id')
          if (cid) setConversationId(cid)
          const h = res.headers.get('x-handoff') as HandoffStatus | null
          if (h) updateHandoff(h === 'resolved' ? 'bot' : h)
        } catch {
          // Non-critical; polling will keep the transcript in sync.
        }
        return
      }

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text }
      const assistantMsg: ChatMessage = { id: generateId(), role: 'assistant', content: '', streaming: true }
      const history = buildHistory()

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)

      try {
        const res = await transport.sendChat({
          message: text,
          conversationId,
          language: activeLang,
          visitorId: visitorIdRef.current,
          history,
        })

        const convId = res.headers.get('x-conversation-id')
        if (convId) setConversationId(convId)

        // The bot may have escalated this turn (intent or repeat fallback).
        const handoff = res.headers.get('x-handoff') as HandoffStatus | null
        if (handoff === 'requested' || handoff === 'live') {
          updateHandoff(handoff)
        }

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
    [streaming, conversationId, leadDismissed, config.leadCapture.enabled, activeLang, transport, syncMessageIds, updateHandoff, buildHistory]
  )

  /** Visitor taps "Talk to a person" → escalate the conversation. */
  const requestHandoff = useCallback(async () => {
    if (handoffStatusRef.current !== 'bot') return
    setSuggestedVisible(false)
    // No conversation yet → escalate via an intent-bearing message, which also
    // creates the conversation server-side.
    if (!conversationId) {
      await sendMessage(HANDOFF_REQUEST_PHRASE[activeLang] ?? HANDOFF_REQUEST_PHRASE.en)
      return
    }
    try {
      const data = await transport.requestHandoff(conversationId)
      if (data) updateHandoff(data.status === 'live' ? 'live' : 'requested')
    } catch {
      // Non-critical.
    }
  }, [conversationId, activeLang, transport, sendMessage, updateHandoff])

  // While in handoff, poll for the agent's status + new human replies (~4s).
  useEffect(() => {
    if (handoffStatus === 'bot' || handoffStatus === 'resolved') return
    if (!conversationId) return
    let active = true

    const poll = async () => {
      try {
        const data = await transport.poll(conversationId, lastPollTsRef.current)
        if (!active) return
        if (data.serverTime) lastPollTsRef.current = data.serverTime
        setAgentName(data.agentName ?? null)

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages((prev) => {
            const have = new Set(prev.map((m) => m.id))
            const adds = data.messages!
              .filter((m) => !have.has(m.id))
              .map((m) => ({ id: m.id, role: 'assistant' as const, content: m.content, fromHuman: true }))
            return adds.length ? [...prev, ...adds] : prev
          })
        }

        // The human episode ended → close it out and let the bot resume.
        if (data.status === 'bot' || data.status === 'resolved') {
          if (handoffStatusRef.current !== 'bot') {
            setMessages((prev) => [
              ...prev,
              { id: generateId(), role: 'assistant', content: HANDOFF_ENDED_NOTE[activeLang] ?? HANDOFF_ENDED_NOTE.en },
            ])
          }
          updateHandoff('bot')
        } else if (data.status !== handoffStatusRef.current) {
          updateHandoff(data.status)
        }
      } catch {
        // Transient; the next tick retries.
      }
    }

    poll()
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [handoffStatus, conversationId, transport, activeLang, updateHandoff])

  const handleLeadSubmit = useCallback(
    async (fields: Record<string, string>) => {
      await transport.submitLead(conversationId, fields)
    },
    [transport, conversationId]
  )

  const getVoiceToken = useCallback(
    (): Promise<{ token: string; voiceId?: string }> => transport.getVoiceToken(activeLang),
    [transport, activeLang],
  )

  const voiceEnabled = Boolean(config.voice?.enabled)
  const headerBorderRadius = `${cornerRadius}px ${cornerRadius}px 0 0`
  // Auto-contrast: keep header text/icons legible on any chosen color.
  const headerFg = readableTextColor(primaryColor)
  // Bot-specific image overrides the company logo when set.
  const widgetAvatar = config.botAvatarUrl || config.avatarUrl
  // For chips/buttons on the white chat body: fall back to a dark accent when
  // the primary color is too light to show on white.
  const onWhiteAccent = isLightColor(primaryColor) ? '#374151' : primaryColor

  return (
    <div
      className="flex flex-col h-full bg-white overflow-hidden"
      style={{ borderRadius: `${cornerRadius}px`, fontFamily: fontStack(config.theme.fontFamily) }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{
          backgroundColor: primaryColor,
          color: headerFg,
          borderRadius: headerBorderRadius,
          borderBottom: `1px solid color-mix(in srgb, ${headerFg} 14%, transparent)`,
        }}
      >
        {widgetAvatar ? (
          <img
            src={widgetAvatar}
            alt={config.displayName}
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: `color-mix(in srgb, ${headerFg} 22%, transparent)` }}
            aria-hidden="true"
          >
            {config.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Name + connection status (status sits under the name) */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate leading-tight">{config.displayName}</p>
          <span className="mt-0.5 flex items-center gap-1 text-xs opacity-80" aria-live="polite">
            {callState === 'idle' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" aria-hidden="true" />
                {activeLang === 'lt' ? 'Prisijungęs' : 'Online'}
              </>
            ) : (
              <>
                <span
                  className={`w-1.5 h-1.5 rounded-full bg-current inline-block ${
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
        </div>

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
            className="flex-shrink-0"
          />
        )}

        {/* Optional extra header control (e.g. preview "Start over") */}
        {headerAction}
      </div>

      {/* Body — messages + composer. Relative so the product list can overlay it. */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {/* Handoff banner */}
        {(handoffStatus === 'requested' || handoffStatus === 'live') && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs flex-shrink-0">
            <HeadsetIcon className="size-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="flex-1">
              {handoffStatus === 'live'
                ? handoffBannerLive(activeLang, agentName)
                : HANDOFF_BANNER_REQUESTED[activeLang] ?? HANDOFF_BANNER_REQUESTED.en}
            </span>
            {handoffStatus === 'requested' && (
              <span className="flex gap-0.5" aria-hidden="true">
                <span className="size-1 rounded-full bg-white/70 animate-bounce [animation-delay:-0.2s]" />
                <span className="size-1 rounded-full bg-white/70 animate-bounce [animation-delay:-0.1s]" />
                <span className="size-1 rounded-full bg-white/70 animate-bounce" />
              </span>
            )}
          </div>
        )}

        <MessageList
          messages={messages}
          primaryColor={primaryColor}
          bubbleRadius={bubbleRadius}
          greeting={greeting}
          displayName={config.displayName}
          avatarUrl={widgetAvatar}
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

        {/* Talk to a person — only while the bot is handling the chat */}
        {handoffStatus === 'bot' && !streaming && (
          <div className="px-4 pt-1 pb-3 flex justify-center flex-shrink-0">
            <button
              type="button"
              onClick={requestHandoff}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-[filter] hover:brightness-95"
              style={{
                backgroundColor: `color-mix(in srgb, ${onWhiteAccent} 12%, transparent)`,
                color: onWhiteAccent,
              }}
            >
              <HeadsetIcon className="size-3.5" aria-hidden="true" />
              {HANDOFF_TALK_LABEL[activeLang] ?? HANDOFF_TALK_LABEL.en}
            </button>
          </div>
        )}

        {/* Optional privacy consent line */}
        {config.privacyUrl && (
          <p className="px-4 pb-1 text-center text-[10px] leading-tight text-muted-foreground">
            {activeLang === 'lt' ? 'Bendraudami sutinkate su ' : 'By chatting you agree to our '}
            <a
              href={config.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              {activeLang === 'lt' ? 'privatumo politika' : 'privacy policy'}
            </a>
            .
          </p>
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
