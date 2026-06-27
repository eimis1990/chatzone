'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HeadsetIcon, RotateCcwIcon } from 'lucide-react'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductListView } from './ProductCards'
import { Composer } from './Composer'
import { VoiceCallButton, type CallState } from '@/components/voice/VoiceCallButton'
import { LeadForm } from './LeadForm'
import { WelcomeScreen } from './WelcomeScreen'
import type { PublicBotConfig } from '@/lib/widget-config'
import { sqLabel, sqPrompt, sqUrl } from '@/lib/widget-config'
import type { ChatTransport } from '@/lib/widget-transport'
import type { BotLanguage, HandoffStatus, SuggestedQuestion } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'
import { fontStack } from '@/lib/fonts'
import { readableTextColor, isLightColor } from '@/lib/utils'

interface ChatWindowProps {
  config: PublicBotConfig
  transport: ChatTransport
  /** Display language override (preview). Live widget uses config.defaultLanguage. */
  initialLanguage?: BotLanguage
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
const LINK_ACTION_NOTE: Record<BotLanguage, string> = {
  en: 'Sure! Just follow the link below 👇',
  lt: 'Žinoma! Tiesiog spustelėkite nuorodą žemiau 👇',
}
const HANDOFF_ENDED_NOTE: Record<BotLanguage, string> = {
  en: 'The chat with our team member has ended. You can keep chatting with the assistant.',
  lt: 'Pokalbis su komandos nariu baigtas. Galite toliau bendrauti su asistentu.',
}
function handoffBannerLive(lang: BotLanguage, agentName: string | null): string {
  const who = agentName?.trim() || (lang === 'lt' ? 'komandos nariu' : 'a team member')
  return lang === 'lt' ? `Bendraujate su ${who}` : `You're chatting with ${who}`
}

// Restart-confirmation copy (shown in the bottom sheet before clearing the chat).
const RESTART_CONFIRM: Record<BotLanguage, { title: string; cancel: string; confirm: string }> = {
  en: {
    title: 'This will start a new conversation',
    cancel: 'Cancel',
    confirm: 'Start new conversation',
  },
  lt: {
    title: 'Pokalbis bus pradėtas iš naujo',
    cancel: 'Atšaukti',
    confirm: 'Pradėti naują pokalbį',
  },
}

const POLL_INTERVAL_MS = 4000

export function ChatWindow({ config, transport, initialLanguage }: ChatWindowProps) {
  const languages = config.languages ?? ['en']

  // Display language is fixed by configuration; visitors can't switch it.
  // Preview passes initialLanguage; the live widget uses the saved default.
  const activeLang: BotLanguage =
    initialLanguage && languages.includes(initialLanguage)
      ? initialLanguage
      : config.defaultLanguage && languages.includes(config.defaultLanguage)
        ? config.defaultLanguage
        : languages[0] ?? 'en'

  // Derived per-language content
  const langContent = config.content[activeLang] ?? config.content[languages[0]] ?? { greeting: '', suggestedQuestions: [] }
  const greeting = langContent.greeting
  const suggestedQuestions = langContent.suggestedQuestions ?? []

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadDismissed, setLeadDismissed] = useState(false)
  // When set, the full-height product list overlay covers the chat body.
  const [listProducts, setListProducts] = useState<CommerceProduct[] | null>(null)
  // Confirmation bottom sheet before clearing the conversation.
  const [confirmRestart, setConfirmRestart] = useState(false)
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

  /** Clear the conversation and start fresh. */
  const handleRestart = useCallback(() => {
    setMessages([])
    setConversationId(undefined)
    setShowLeadForm(false)
    setLeadDismissed(false)
    setListProducts(null)
    setAgentName(null)
    setConfirmRestart(false)
    lastPollTsRef.current = undefined
    updateHandoff('bot')
  }, [updateHandoff])

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

  // Voice `order_status` tool: look up an order, show a card, speak a summary.
  const handleVoiceOrder = useCallback(
    async (orderId: string, email: string): Promise<string> => {
      try {
        const r = await transport.lookupOrder(orderId, email)
        if (r.order?.found) {
          setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: '', order: r.order }])
        }
        return r.summary
      } catch {
        return 'The order lookup is temporarily unavailable.'
      }
    },
    [transport],
  )

  // Voice `discount_code` tool: surface the code in chat + speak it.
  const handleVoiceDiscount = useCallback(async (): Promise<string> => {
    try {
      const r = await transport.getDiscountInfo()
      if (r.available && r.code) {
        const label = activeLang === 'lt' ? 'Nuolaidos kodas' : 'Discount code'
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `${label}: ${r.code}${r.description ? ` — ${r.description}` : ''}`,
          },
        ])
      }
      return r.summary
    } catch {
      return 'No discount is available right now.'
    }
  }, [transport, activeLang])

  const primaryColor = config.theme.primaryColor
  const cornerRadius = config.theme.cornerRadius ?? 16
  const bubbleRadius = config.theme.bubbleRadius ?? 16
  const glassBubbles = config.theme.glassBubbles ?? false
  const bubbleBorderColor = config.theme.bubbleBorderColor ?? '#e5e7eb'
  const bubbleBorderWidth = config.theme.bubbleBorderWidth ?? 0

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
    async (text: string, displayText?: string) => {
      if (streaming) return

      // If a live call is in progress, typing ends it and drops back to text chat.
      if (callStateRef.current !== 'idle') {
        endVoiceRef.current?.()
      }

      // While a human is handling, the visitor's message is stored but the bot
      // does not reply — the agent answers from the inbox (surfaced via polling).
      if (handoffStatusRef.current === 'requested' || handoffStatusRef.current === 'live') {
        const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, displayContent: displayText }
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

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text, displayContent: displayText }
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
        let accumulatedOrder: OrderStatus | null = null

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
              } else if (event.t === 'order' && event.v) {
                accumulatedOrder = event.v as OrderStatus
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
            } else if (event.t === 'order' && event.v) {
              accumulatedOrder = event.v as OrderStatus
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
                  order: accumulatedOrder ?? undefined,
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

  /** "Open URL" quick action: reply with a short note + a button to the link. */
  const showLinkAction = useCallback(
    (label: string, url: string) => {
      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: label }
      const botMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: LINK_ACTION_NOTE[activeLang] ?? LINK_ACTION_NOTE.en,
        link: { url, label },
      }
      setMessages((prev) => [...prev, userMsg, botMsg])
    },
    [activeLang],
  )

  /** Welcome-screen quick action: open a link, or send a prompt/label to the bot. */
  const handleQuickAction = useCallback(
    (action: SuggestedQuestion) => {
      const label = sqLabel(action)
      const url = sqUrl(action)
      if (url) {
        showLinkAction(label, url)
      } else {
        void sendMessage(sqPrompt(action), label)
      }
    },
    [showLinkAction, sendMessage],
  )

  /** Visitor taps "Talk to a person" → escalate the conversation. */
  const requestHandoff = useCallback(async () => {
    if (handoffStatusRef.current !== 'bot') return
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
  const showCallButton = config.theme.showCallButton !== false
  const callButtonColor = config.theme.callButtonColor || '#22c55e'
  const navButtonRadius = config.theme.navButtonRadius ?? 12
  const headerBorderRadius = `${cornerRadius}px ${cornerRadius}px 0 0`
  // Auto-contrast: keep header text/icons legible on any chosen color.
  const headerFg = readableTextColor(primaryColor)
  // Header shows the company logo (brand); message bubbles show the bot avatar.
  // Each falls back to the other, then to the name initial.
  const headerAvatar = config.avatarUrl || config.botAvatarUrl
  const messageAvatar = config.botAvatarUrl || config.avatarUrl
  // For chips/buttons on the white chat body: fall back to a dark accent when
  // the primary color is too light to show on white.
  const onWhiteAccent = isLightColor(primaryColor) ? '#374151' : primaryColor

  // Custom chat-body background: a base color with an optional image overlaid at
  // a chosen opacity. Defaults preserve the original solid-white look.
  const bgColor = config.theme.backgroundColor || '#ffffff'
  const bgImage = config.theme.backgroundImageUrl
  const bgImageOpacity = (config.theme.backgroundImageOpacity ?? 100) / 100
  // Whether the chat body is dark — drives readable colors for chips/text that
  // sit directly on the background (e.g. the "talk to a person" button).
  const darkBody = !isLightColor(bgColor)

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
        {headerAvatar ? (
          <img
            src={headerAvatar}
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

        {/* Voice call button — when voice is on and the client hasn't hidden it */}
        {voiceEnabled && showCallButton && (
          <VoiceCallButton
            appearance="compact"
            getToken={getVoiceToken}
            primaryColor="#ffffff"
            callColor={callButtonColor}
            language={activeLang}
            radius={navButtonRadius}
            onStateChange={handleCallState}
            onTranscript={handleVoiceTranscript}
            onReady={handleVoiceReady}
            onSearch={handleVoiceSearch}
            onOrderStatus={handleVoiceOrder}
            onDiscount={handleVoiceDiscount}
            className="flex-shrink-0"
          />
        )}

        {/* Restart — asks for confirmation before clearing the conversation */}
        <button
          type="button"
          onClick={() => (messages.length > 0 ? setConfirmRestart(true) : handleRestart())}
          title={activeLang === 'lt' ? 'Pradėti iš naujo' : 'Start over'}
          aria-label={activeLang === 'lt' ? 'Pradėti iš naujo' : 'Start over'}
          className="flex size-8 flex-shrink-0 items-center justify-center transition hover:brightness-90"
          style={{
            backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)',
            borderRadius: `${navButtonRadius}px`,
          }}
        >
          <RotateCcwIcon className="size-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body — messages + composer. Relative so the product list can overlay it;
          isolate so the background image layer (−z-10) stays behind the content. */}
      <div
        className="relative isolate flex-1 flex flex-col min-h-0"
        style={{ backgroundColor: bgColor }}
      >
        {/* Optional background image, overlaid on the base color at chosen opacity. */}
        {bgImage ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImage})`, opacity: bgImageOpacity }}
          />
        ) : null}
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

        {messages.length === 0 ? (
          <WelcomeScreen
            displayName={config.displayName}
            tagline={config.tagline}
            avatarUrl={messageAvatar}
            greeting={greeting}
            suggestedQuestions={suggestedQuestions}
            primaryColor={primaryColor}
            backgroundColor={bgColor}
            bubbleRadius={bubbleRadius}
            glassBubbles={glassBubbles}
            bubbleBorderColor={bubbleBorderColor}
            bubbleBorderWidth={bubbleBorderWidth}
            onSelect={handleQuickAction}
          />
        ) : (
          <MessageList
            messages={messages}
            primaryColor={primaryColor}
            bubbleRadius={bubbleRadius}
            displayName={config.displayName}
            avatarUrl={messageAvatar}
            activeLang={activeLang}
            glassBubbles={glassBubbles}
            bubbleBorderColor={bubbleBorderColor}
            bubbleBorderWidth={bubbleBorderWidth}
            onSeeAllProducts={setListProducts}
            onFeedback={handleFeedback}
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

        {/* Talk to a person — only once the conversation has started (not on the
            welcome screen) and while the bot is handling the chat */}
        {handoffStatus === 'bot' && !streaming && messages.length > 0 && (
          <div className="px-4 pt-1 pb-3 flex justify-center flex-shrink-0">
            <button
              type="button"
              onClick={requestHandoff}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-[filter] hover:brightness-95"
              style={
                darkBody
                  ? { backgroundColor: 'rgba(255,255,255,0.16)', color: '#ffffff' }
                  : {
                      backgroundColor: `color-mix(in srgb, ${onWhiteAccent} 12%, transparent)`,
                      color: onWhiteAccent,
                    }
              }
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
          radius={navButtonRadius}
          backgroundColor={bgColor}
          sendIconUrl={config.theme.sendIconUrl}
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

        {/* Restart confirmation — dims the chat and slides a sheet up over the composer */}
        <AnimatePresence>
          {confirmRestart && (
            <motion.div
              key="restart-backdrop"
              className="absolute inset-0 z-20 bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setConfirmRestart(false)}
              aria-hidden="true"
            />
          )}
          {confirmRestart && (
            <motion.div
              key="restart-sheet"
              role="dialog"
              aria-modal="true"
              className="absolute inset-x-0 bottom-0 z-30 bg-white px-5 pb-5 pt-5 shadow-[0_-8px_24px_rgba(0,0,0,0.1)]"
              style={{ borderRadius: `${bubbleRadius + 4}px ${bubbleRadius + 4}px 0 0` }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            >
              <p className="text-center text-sm text-gray-600">{RESTART_CONFIRM[activeLang].title}</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmRestart(false)}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {RESTART_CONFIRM[activeLang].cancel}
                </button>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="rounded-full px-4 py-2 text-sm font-semibold transition-[filter] hover:brightness-95"
                  style={{ backgroundColor: onWhiteAccent, color: readableTextColor(onWhiteAccent) }}
                >
                  {RESTART_CONFIRM[activeLang].confirm}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
