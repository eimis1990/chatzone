'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HeadsetIcon, RotateCcwIcon, XIcon } from 'lucide-react'
import { MessageList, type ChatMessage } from './MessageList'
import { ProductListView } from './ProductCards'
import { RoomTray, RoomStudio, roomLabels, MAX_ROOM_PRODUCTS, type RoomSelect } from './RoomVisualizer'
import { Composer } from './Composer'
import { VoiceCallButton, type CallState } from '@/components/voice/VoiceCallButton'
import { LeadForm } from './LeadForm'
import { WelcomeScreen } from './WelcomeScreen'
import type { PublicBotConfig } from '@/lib/widget-config'
import { sqLabel, sqMode, sqPrompt, sqQuery, sqUrl } from '@/lib/widget-config'
import { SiriOrb } from './SiriOrb'
import type { ChatTransport } from '@/lib/widget-transport'
import type { BotLanguage, HandoffStatus, SuggestedQuestion } from '@/lib/types'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'
import { fontStack } from '@/lib/fonts'
import { readableTextColor, isLightColor } from '@/lib/utils'
import { tintToward } from '@/lib/theme-extract'
import { languageMeta } from '@/lib/i18n/languages'
import { normalizeVoiceTranscript } from '@/lib/voice/transcript'

interface ChatWindowProps {
  config: PublicBotConfig
  transport: ChatTransport
  /** Display language override (preview). Live widget uses config.defaultLanguage. */
  initialLanguage?: BotLanguage
  /**
   * When set, a close (✕) button replaces the header avatar on mobile — used by
   * the full-screen mobile embed (posts a message to the parent) and the
   * configurator preview (closes the preview card). Desktop keeps the avatar.
   */
  onRequestClose?: () => void
  /**
   * True full-screen-mobile signal from the embedding parent (widget.js), which
   * knows the real outer viewport. The iframe's own width is always narrow
   * (~420px on desktop), so an in-iframe media query can't tell desktop from
   * mobile — when provided this overrides it. Omitted in the in-app preview,
   * which falls back to its own media query.
   */
  isMobileOverride?: boolean
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

// Only persisted (synced) message ids are UUIDs; local ids stay out of events.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
// "Show products" quick-action copy.
const PRODUCTS_ACTION_NOTE: Record<BotLanguage, string> = {
  en: 'Here you go — take a look: 🛍️',
  lt: 'Prašom, pažiūrėkite: 🛍️',
}
const PRODUCTS_ACTION_EMPTY: Record<BotLanguage, string> = {
  en: "I couldn't find products to show right now — try asking me instead!",
  lt: 'Šiuo metu nepavyko rasti prekių — pabandykite manęs paklausti!',
}
// Call problems surfaced above the composer (composer-placed call button —
// the header placement shows these inline next to its own button).
const VOICE_ISSUE_COPY: Record<'mic-denied' | 'unavailable' | 'error', Record<BotLanguage, string>> = {
  'mic-denied': {
    en: 'Microphone access denied — allow it in your browser settings to talk.',
    lt: 'Mikrofonas užblokuotas — leiskite jį naršyklės nustatymuose.',
  },
  unavailable: {
    en: "Voice calling isn't available right now.",
    lt: 'Skambučiai balsu šiuo metu negalimi.',
  },
  error: {
    en: 'Could not start the call — please try again.',
    lt: 'Nepavyko pradėti pokalbio — bandykite dar kartą.',
  },
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

export function ChatWindow({ config, transport, initialLanguage, onRequestClose, isMobileOverride }: ChatWindowProps) {
  const languages = config.languages ?? ['en']

  // Narrow viewport → the widget is a full-screen sheet, so show an in-header
  // close button (mobile has no room for the floating launcher). The parent's
  // signal (isMobileOverride) wins when present; otherwise fall back to our own
  // media query (in-app preview, not iframed).
  const [mqMobile, setMqMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setMqMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const isMobile = isMobileOverride ?? mqMobile
  const showClose = isMobile && !!onRequestClose

  // Starting language: preview override > saved default > first configured.
  // Visitors can switch between the bot's configured languages via the header
  // picker (multilingual bots only); the choice persists per visitor.
  const startLang: BotLanguage =
    initialLanguage && languages.includes(initialLanguage)
      ? initialLanguage
      : config.defaultLanguage && languages.includes(config.defaultLanguage)
        ? config.defaultLanguage
        : languages[0] ?? 'en'
  const [activeLang, setActiveLang] = useState<BotLanguage>(startLang)
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  // Preview: follow the configurator's language toggle.
  useEffect(() => {
    if (initialLanguage && languages.includes(initialLanguage)) setActiveLang(initialLanguage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLanguage])

  // Live widget: restore the visitor's last language choice (if still offered).
  useEffect(() => {
    if (initialLanguage) return
    try {
      const saved = localStorage.getItem('cbz_lang') as BotLanguage | null
      if (saved && languages.includes(saved)) setActiveLang(saved)
    } catch {
      /* storage unavailable — keep default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pickLanguage = (lang: BotLanguage) => {
    setActiveLang(lang)
    setLangMenuOpen(false)
    try {
      localStorage.setItem('cbz_lang', lang)
    } catch {
      /* ignore */
    }
  }

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
  // Room visualizer: products picked from cards, and the studio overlay.
  const [roomSelection, setRoomSelection] = useState<CommerceProduct[]>([])
  const [studioOpen, setStudioOpen] = useState(false)
  const roomEnabled = config.roomVisualizer && Boolean(transport.visualize) && Boolean(conversationId)
  // Confirmation bottom sheet before clearing the conversation.
  const [confirmRestart, setConfirmRestart] = useState(false)
  // Live-call state, surfaced in the header.
  const [callState, setCallState] = useState<CallState>('idle')
  const callStateRef = useRef<CallState>('idle')
  const endVoiceRef = useRef<(() => void) | null>(null)
  const startVoiceRef = useRef<(() => void) | null>(null)
  const [voiceIssue, setVoiceIssue] = useState<'mic-denied' | 'unavailable' | 'error' | null>(null)
  const visitorIdRef = useRef<string>('')
  // Latest messages, for building request history without re-creating callbacks.
  const messagesRef = useRef<ChatMessage[]>([])
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Prior turns sent to the (stateless) chat transport. Card-only messages
  // (empty content + products) must survive, and assistant products ride along,
  // so the preview endpoint can rebuild card awareness like /api/chat does.
  const buildHistory = useCallback(
    () =>
      messagesRef.current
        .filter(
          (m) =>
            (m.role === 'user' || m.role === 'assistant') &&
            (!!m.content || !!m.products?.length) &&
            !m.streaming,
        )
        .map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.role === 'assistant' && m.products?.length
            ? { products: m.products.slice(0, 24) }
            : {}),
        })),
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
    setRoomSelection([])
    lastPollTsRef.current = undefined
    updateHandoff('bot')
  }, [updateHandoff])

  const toggleRoomProduct = useCallback((p: CommerceProduct) => {
    setRoomSelection((prev) =>
      prev.some((x) => x.id === p.id)
        ? prev.filter((x) => x.id !== p.id)
        : prev.length >= MAX_ROOM_PRODUCTS
          ? prev
          : [...prev, p],
    )
  }, [])

  const handleCallState = useCallback((s: CallState) => {
    callStateRef.current = s
    setCallState(s)
  }, [])

  // Voice utterances (visitor + agent) flow into the chat transcript. The agent
  // wraps replies in language tags (<Lithuanian>…</Lithuanian>) for TTS — strip
  // them for display.
  const handleVoiceTranscript = useCallback((role: 'user' | 'assistant', text: string) => {
    const clean = normalizeVoiceTranscript(
      text.replace(/<\/?[A-Za-z][\w-]*>/g, '').trim(),
      activeLang,
    )
    if (!clean) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last && last.role === role && last.content === clean) return prev
      return [...prev, { id: generateId(), role, content: clean }]
    })
  }, [activeLang])

  const handleVoiceReady = useCallback((c: { end: () => void; start: () => void }) => {
    endVoiceRef.current = c.end
    startVoiceRef.current = c.start
  }, [])

  // Voice search returns semantic candidates without displaying them. The
  // ElevenLabs agent reviews their structured facts and then calls
  // `display_products` with only verified ids.
  const handleVoiceSearch = useCallback(
    async (query: string, audience?: 'women' | 'men' | 'kids' | 'unisex') => {
      try {
        return await transport.search(query, audience)
      } catch {
        return { products: [], summary: 'The product search is temporarily unavailable.' }
      }
    },
    [transport],
  )

  const handleVoiceDisplayProducts = useCallback((products: CommerceProduct[]) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: 'assistant', content: '', products },
    ])
  }, [])

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

  // Voice `search_knowledge` tool: retrieve knowledge-base context so the agent
  // can answer informational questions out loud (parity with text chat). The
  // agent speaks the answer, so we just return the retrieved text.
  const handleVoiceKnowledge = useCallback(
    async (query: string): Promise<string> => {
      try {
        const { answer } = await transport.searchKnowledge(query)
        return (
          answer ||
          "I don't have that information to hand — I can connect you with a person if you'd like."
        )
      } catch {
        return 'That lookup is temporarily unavailable.'
      }
    },
    [transport],
  )

  // Voice `get_product_details` tool: full live details for one product by its
  // spoken name — the agent answers from the returned text (no cards pushed).
  const handleVoiceProductDetails = useCallback(
    async (productName: string): Promise<string> => {
      try {
        const { summary } = await transport.getProductDetailsByName(productName)
        return summary || 'Could not fetch the product details right now.'
      } catch {
        return 'Could not fetch the product details right now.'
      }
    },
    [transport],
  )

  const primaryColor = config.theme.primaryColor

  // Room visualizer selection UI — shown whenever the feature + transport are
  // available (doesn't require conversationId, cards can appear before one exists).
  const roomSelect: RoomSelect | undefined =
    config.roomVisualizer && transport.visualize
      ? {
          selectedIds: roomSelection.map((p) => p.id),
          full: roomSelection.length >= MAX_ROOM_PRODUCTS,
          onToggle: toggleRoomProduct,
          addLabel: roomLabels(activeLang).addToRoom,
          addedLabel: roomLabels(activeLang).added,
        }
      : undefined

  const cornerRadius = config.theme.cornerRadius ?? 16
  const bubbleRadius = config.theme.bubbleRadius ?? 16
  const glassBubbles = config.theme.glassBubbles ?? false
  const bubbleBorderColor = config.theme.bubbleBorderColor || '#e5e7eb'
  const bubbleBorderWidth = config.theme.bubbleBorderWidth ?? 0
  const chatBg = config.theme.backgroundColor || '#ffffff'
  const darkChat = !isLightColor(chatBg)
  // On a dark background an unset bot-bubble color must NOT fall back to the
  // light default (light bubbles on a dark chat) — derive a slightly-lifted
  // dark surface from the background instead.
  const botBubbleColor =
    config.theme.botBubbleColor || (darkChat ? tintToward(chatBg, 0.1) : undefined)

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

  /** Fire-and-forget analytics event (no-op in the configurator preview). */
  const track = useCallback(
    (
      type: 'product_click' | 'link_click' | 'suggested_question_click',
      payload: Record<string, string>,
      messageId?: string,
    ) => {
      transport.trackEvent?.({
        type,
        conversationId,
        messageId: messageId && UUID_RE.test(messageId) ? messageId : undefined,
        payload,
      })
    },
    [transport, conversationId],
  )

  const trackProductClick = useCallback(
    (p: CommerceProduct, messageId?: string) =>
      track('product_click', { productId: p.id, title: p.title, price: p.price, url: p.url }, messageId),
    [track],
  )

  const trackLinkClick = useCallback(
    (url: string, kind: 'answer' | 'action', messageId?: string) => track('link_click', { url, kind }, messageId),
    [track],
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
        // "After N messages" trigger is counted client-side: the visitor's Nth
        // message opens the form (needs at least one configured field).
        {
          const lc = config.leadCapture
          if (lc.enabled && lc.trigger === 'after_n_messages' && lc.fields.length > 0 && !leadDismissed) {
            const userTurns = messagesRef.current.filter((m) => m.role === 'user').length
            if (userTurns >= (lc.afterNMessages ?? 3)) setShowLeadForm(true)
          }
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
                // Product tools can finish before the model's final sentence.
                // Render their cards immediately instead of holding them until
                // the entire streamed response completes.
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, products: accumulatedProducts, streaming: true }
                      : m
                  )
                )
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
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, products: accumulatedProducts, streaming: true }
                    : m
                )
              )
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
    [streaming, conversationId, leadDismissed, config.leadCapture, activeLang, transport, syncMessageIds, updateHandoff, buildHistory]
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

  /** "Show products" quick action: fetch products for the configured query (a
   *  search phrase or a store category/tag/collection URL) and render them as
   *  cards — deterministic, no LLM round-trip. */
  const runProductsAction = useCallback(
    async (label: string, query: string) => {
      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: label }
      const pendingId = generateId()
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: pendingId, role: 'assistant', content: '', streaming: true },
      ])
      let done: Partial<ChatMessage>
      try {
        const data = await transport.search(query)
        const products = data.products ?? []
        done = products.length
          ? { content: PRODUCTS_ACTION_NOTE[activeLang] ?? PRODUCTS_ACTION_NOTE.en, products }
          : { content: PRODUCTS_ACTION_EMPTY[activeLang] ?? PRODUCTS_ACTION_EMPTY.en }
      } catch {
        done = { content: PRODUCTS_ACTION_EMPTY[activeLang] ?? PRODUCTS_ACTION_EMPTY.en }
      }
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, ...done, streaming: false } : m)),
      )
    },
    [transport, activeLang],
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

  /**
   * Welcome-screen quick action. By mode:
   *   - 'handoff' → same escalation flow as the "Talk to a person" button
   *     (works even when that button is hidden by the theme).
   *   - 'lead'    → open the contact form when lead capture is on; otherwise
   *     fall back to sending the label as a plain message.
   *   - 'url'      → reply with a short note + a link button to follow.
   *   - 'products' → show product cards for the configured query/URL.
   *   - otherwise  → send the prompt (or the label itself) to the bot.
   */
  const handleQuickAction = useCallback(
    (action: SuggestedQuestion) => {
      const label = sqLabel(action)
      const mode = sqMode(action)
      track('suggested_question_click', { question: label, mode: mode ?? 'prompt' })
      if (mode === 'handoff') {
        void requestHandoff()
        return
      }
      if (mode === 'lead' && config.leadCapture.enabled && config.leadCapture.fields.length > 0) {
        setLeadDismissed(false)
        setShowLeadForm(true)
        return
      }
      if (mode === 'url') {
        showLinkAction(label, sqUrl(action)!)
        return
      }
      if (mode === 'products') {
        void runProductsAction(label, sqQuery(action))
        return
      }
      // Hidden prompt ≠ visible label: mark it so the model knows the visitor
      // only saw the button label and never quotes the internal instruction
      // (see the QUICK ACTIONS rule in lib/ai/prompt.ts).
      const prompt = sqPrompt(action)
      void sendMessage(
        prompt === label
          ? prompt
          : `[Visitor clicked "${label}" — internal instruction, never quote or mention it: ${prompt}]`,
        label,
      )
    },
    [showLinkAction, sendMessage, requestHandoff, runProductsAction, track, config.leadCapture.enabled, config.leadCapture.fields.length],
  )

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
  // Composer placement: the call button lives inside the message field (and
  // morphs into send while typing); the header shows no call button. The
  // VoiceCallButton still mounts headlessly to own the call session.
  const callInComposer =
    voiceEnabled && showCallButton && (config.theme.callButtonPlacement ?? 'header') === 'composer'
  const callActive = callState !== 'idle'
  const callButtonColor = config.theme.callButtonColor || '#22c55e'
  const navButtonRadius = config.theme.navButtonRadius ?? 12
  // Full-screen mobile sheet has square top corners (it meets the screen edge).
  const headerBorderRadius = isMobile ? '0' : `${cornerRadius}px ${cornerRadius}px 0 0`
  // Header layout: classic bar / floating inset pill / curved body overlap.
  const headerStyle = config.theme.headerStyle ?? 'classic'
  const hideHeaderLogo = config.theme.hideHeaderLogo ?? false
  // Radius used by the floating pill and the curved body card — keeps the
  // style visible even when the window corners are set to 0.
  const styleRadius = Math.max(cornerRadius, 12)
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
      className="flex flex-col h-full overflow-hidden"
      style={{
        borderRadius: isMobile ? 0 : `${cornerRadius}px`,
        fontFamily: fontStack(config.theme.fontFamily),
        fontWeight: config.theme.fontWeight ?? 400,
        // Shows through the floating header's gap; body covers it otherwise.
        backgroundColor: bgColor,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{
          backgroundColor: primaryColor,
          color: headerFg,
          ...(headerStyle === 'floating'
            ? { margin: '10px', borderRadius: `${styleRadius}px` }
            : headerStyle === 'curved'
              ? { borderRadius: headerBorderRadius, paddingBottom: `${16 + styleRadius}px` }
              : {
                  borderRadius: headerBorderRadius,
                  borderBottom: `1px solid color-mix(in srgb, ${headerFg} 14%, transparent)`,
                }),
        }}
      >
        {showClose ? (
          // Mobile: close (✕) replaces the avatar — same style as the restart button.
          <button
            type="button"
            onClick={onRequestClose}
            title={activeLang === 'lt' ? 'Uždaryti' : 'Close'}
            aria-label={activeLang === 'lt' ? 'Uždaryti' : 'Close'}
            className="flex size-8 flex-shrink-0 items-center justify-center transition hover:brightness-90"
            style={{
              backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)',
              borderRadius: `${navButtonRadius}px`,
            }}
          >
            <XIcon className="size-4" aria-hidden="true" />
          </button>
        ) : hideHeaderLogo ? null : headerAvatar ? (
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

        {/* Voice call button — when voice is on and the client hasn't hidden it.
            Composer placement mounts it headlessly (owns the session; the
            composer's button drives it via startVoiceRef/endVoiceRef). */}
        {voiceEnabled && showCallButton && (
          <VoiceCallButton
            appearance={callInComposer ? 'none' : 'compact'}
            iconOnly={config.theme.compactCallButton ?? false}
            getToken={getVoiceToken}
            primaryColor="#ffffff"
            callColor={callButtonColor}
            language={activeLang}
            radius={navButtonRadius}
            shortLabel={isMobile}
            onStateChange={handleCallState}
            onTranscript={handleVoiceTranscript}
            onReady={handleVoiceReady}
            onIssue={callInComposer ? setVoiceIssue : undefined}
            onSearch={handleVoiceSearch}
            onDisplayProducts={handleVoiceDisplayProducts}
            onOrderStatus={handleVoiceOrder}
            onDiscount={handleVoiceDiscount}
            onKnowledge={handleVoiceKnowledge}
            onProductDetails={handleVoiceProductDetails}
            className="flex-shrink-0"
          />
        )}

        {/* Language picker — flag-only square, multilingual bots with the
            selector enabled. Disabled during a voice call (the call is bound
            to the language it started in). */}
        {languages.length > 1 && config.showLanguageSelector && (
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setLangMenuOpen((o) => !o)}
              disabled={callState !== 'idle'}
              title={languageMeta(activeLang).nativeLabel}
              aria-label={activeLang === 'lt' ? 'Pakeisti kalbą' : 'Change language'}
              aria-expanded={langMenuOpen}
              className="flex size-8 items-center justify-center text-base transition hover:brightness-90 disabled:opacity-50"
              style={{
                backgroundColor: 'color-mix(in srgb, currentColor 15%, transparent)',
                borderRadius: `${navButtonRadius}px`,
              }}
            >
              <span aria-hidden="true">{languageMeta(activeLang).flag}</span>
            </button>
            {langMenuOpen && (
              <>
                {/* invisible backdrop to close on outside tap */}
                <div className="fixed inset-0 z-40" onClick={() => setLangMenuOpen(false)} aria-hidden="true" />
                <div
                  className="absolute right-0 top-full z-50 mt-1.5 min-w-36 overflow-hidden bg-white py-1 text-gray-900 shadow-xl ring-1 ring-black/10"
                  style={{ borderRadius: `${Math.min(navButtonRadius + 2, 14)}px` }}
                  role="listbox"
                  aria-label="Language"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      role="option"
                      aria-selected={lang === activeLang}
                      onClick={() => pickLanguage(lang)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 ${
                        lang === activeLang ? 'font-semibold' : ''
                      }`}
                    >
                      <span aria-hidden="true">{languageMeta(lang).flag}</span>
                      <span className="flex-1">{languageMeta(lang).nativeLabel}</span>
                      {lang === activeLang && <span aria-hidden="true" className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
        className="relative isolate flex-1 flex flex-col min-h-0 overflow-hidden"
        style={{
          backgroundColor: bgColor,
          // Curved: the body card slides up over the header's padded bottom.
          // While the full-screen product list overlay is open it covers the
          // whole body, so drop the rounded top corners — otherwise the curve
          // shows through as notches above the list's sub-header bar.
          ...(headerStyle === 'curved'
            ? {
                marginTop: `-${styleRadius}px`,
                borderRadius: listProducts ? '0' : `${styleRadius}px ${styleRadius}px 0 0`,
              }
            : {}),
        }}
      >
        {/* Optional background image, overlaid on the base color at chosen opacity. */}
        {bgImage ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
            style={{ backgroundImage: `url("${bgImage}")`, opacity: bgImageOpacity }}
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

        {/* Live-call orb — pinned above the transcript for the whole call so
            bubbles scroll up to it, never over or under it. Particle sphere in
            brand shades; `activity` makes it settle while the visitor talks
            (listening) and come alive while the agent speaks. */}
        {callActive && (
          <div className="flex flex-shrink-0 items-center justify-center py-3">
            <SiriOrb
              size={88}
              color={primaryColor}
              dark={darkBody}
              activity={callState === 'speaking' ? 1 : callState === 'connecting' ? 0.55 : 0.22}
            />
          </div>
        )}

        {messages.length === 0 && !callActive ? (
          <WelcomeScreen
            displayName={config.displayName}
            tagline={config.tagline}
            avatarUrl={messageAvatar}
            greeting={greeting}
            suggestedQuestions={suggestedQuestions}
            primaryColor={primaryColor}
            backgroundColor={bgColor}
            botBubbleColor={botBubbleColor}
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
            botBubbleColor={botBubbleColor}
            darkBackground={darkChat}
            onSeeAllProducts={setListProducts}
            onFeedback={handleFeedback}
            onProductClick={trackProductClick}
            onLinkClick={trackLinkClick}
            roomSelect={roomSelect}
          />
        )}

        {/* Lead Form */}
        {showLeadForm && !leadDismissed && config.leadCapture.fields.length > 0 && (
          <LeadForm
            fields={config.leadCapture.fields}
            primaryColor={primaryColor}
            lang={activeLang}
            title={config.leadCapture.title}
            onSubmit={handleLeadSubmit}
            onDismiss={() => {
              setShowLeadForm(false)
              setLeadDismissed(true)
            }}
          />
        )}

        {/* Talk to a person — only once the conversation has started (not on the
            welcome screen), while the bot is handling the chat, and when the
            client has enabled the handoff button. */}
        {config.theme.showHandoffButton !== false && handoffStatus === 'bot' && !streaming && messages.length > 0 && (
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

        {/* Room visualizer tray — hidden behind the full-list overlay or the lead form */}
        {roomSelect &&
          !listProducts &&
          !(showLeadForm && !leadDismissed && config.leadCapture.fields.length > 0) && (
            <RoomTray
              products={roomSelection}
              primaryColor={primaryColor}
              language={activeLang}
              onRemove={(id) => setRoomSelection((prev) => prev.filter((p) => p.id !== id))}
              onOpen={() => setStudioOpen(true)}
            />
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
          fieldColor={config.theme.composerFieldColor}
          fieldBorderColor={config.theme.composerBorderColor}
          sendColor={config.theme.sendButtonColor}
          voiceCall={
            callInComposer
              ? {
                  state: callState,
                  start: () => startVoiceRef.current?.(),
                  end: () => endVoiceRef.current?.(),
                  callColor: callButtonColor,
                }
              : undefined
          }
          notice={voiceIssue ? (VOICE_ISSUE_COPY[voiceIssue][activeLang] ?? VOICE_ISSUE_COPY[voiceIssue].en) : null}
          onTranscribe={
            config.dictation && transport.transcribe
              ? (audio) => transport.transcribe!(audio, activeLang).then((r) => r.text)
              : undefined
          }
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
              onProductClick={trackProductClick}
              roomSelect={roomSelect}
            />
          )}
        </AnimatePresence>

        {/* Fullscreen room-studio overlay (upload photo, generate, regenerate) */}
        <AnimatePresence>
          {studioOpen && transport.visualize && (
            <RoomStudio
              products={roomSelection}
              conversationId={conversationId}
              visualize={transport.visualize}
              primaryColor={primaryColor}
              language={activeLang}
              onClose={() => setStudioOpen(false)}
              onResult={(image) =>
                setMessages((prev) => [
                  ...prev,
                  { id: generateId(), role: 'assistant', content: roomLabels(activeLang).resultNote, image },
                ])
              }
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
