'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageList, type ChatMessage } from './MessageList'
import { Composer } from './Composer'
import { LeadForm } from './LeadForm'
import { SuggestedQuestions } from './SuggestedQuestions'
import type { PublicBotConfig } from '@/lib/widget-config'
import type { BotLanguage } from '@/lib/types'

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
  const visitorIdRef = useRef<string>('')
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
  }, [activeLang])

  /**
   * After a full chat turn, fetch the real DB message ids for the conversation
   * so the TTS button can use them.
   */
  const syncMessageIds = useCallback(
    async (convId: string) => {
      if (!config.voice?.enabled || !config.voice?.ttsEnabled) return
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
    [publicKey, config.voice?.enabled, config.voice?.ttsEnabled],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming) return

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
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const chunk = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: chunk, streaming: true } : m
            )
          )
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: accumulated, streaming: false } : m
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

  const headerBorderRadius = `${cornerRadius}px ${cornerRadius}px 0 0`

  return (
    <div
      className="flex flex-col h-full bg-white font-sans overflow-hidden"
      style={{ borderRadius: `${cornerRadius}px` }}
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

        <span className="flex items-center gap-1 text-xs opacity-80 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" aria-hidden="true" />
          Online
        </span>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        primaryColor={primaryColor}
        bubbleRadius={bubbleRadius}
        greeting={greeting}
        displayName={config.displayName}
        avatarUrl={config.avatarUrl}
        voice={config.voice}
        publicKey={publicKey}
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
        voice={config.voice}
        publicKey={publicKey}
      />
    </div>
  )
}
