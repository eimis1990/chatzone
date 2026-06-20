'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageList, type ChatMessage } from './MessageList'
import { Composer } from './Composer'
import { LeadForm } from './LeadForm'
import { SuggestedQuestions } from './SuggestedQuestions'
import type { PublicBotConfig } from '@/lib/widget-config'

interface ChatWindowProps {
  publicKey: string
  config: PublicBotConfig
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

export function ChatWindow({ publicKey, config }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [showLeadForm, setShowLeadForm] = useState(false)
  const [leadDismissed, setLeadDismissed] = useState(false)
  const [suggestedVisible, setSuggestedVisible] = useState(true)
  const visitorIdRef = useRef<string>('')
  const primaryColor = config.theme.primaryColor

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
      // If localStorage is unavailable (e.g. cross-origin storage blocking)
      // generate an in-memory ID for this session
      id = crypto.randomUUID()
    }
    visitorIdRef.current = id
  }, [])

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
          }),
        })

        // Capture conversation id from response headers
        const convId = res.headers.get('x-conversation-id')
        if (convId) setConversationId(convId)

        // Check lead-capture signal
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
    [streaming, conversationId, leadDismissed, config.leadCapture.enabled, publicKey]
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

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
        style={{ backgroundColor: primaryColor }}
      >
        {config.avatarUrl ? (
          <img
            src={config.avatarUrl}
            alt={config.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold" aria-hidden="true">
            {config.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-sm">{config.displayName}</span>
        <span className="ml-auto flex items-center gap-1 text-xs opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" aria-hidden="true" />
          Online
        </span>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        primaryColor={primaryColor}
        greeting={config.greeting}
        displayName={config.displayName}
        avatarUrl={config.avatarUrl}
      />

      {/* Suggested Questions (shown until first message is sent) */}
      {suggestedVisible && config.suggestedQuestions.length > 0 && (
        <SuggestedQuestions
          questions={config.suggestedQuestions}
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
      <Composer onSend={sendMessage} disabled={streaming} primaryColor={primaryColor} />
    </div>
  )
}
