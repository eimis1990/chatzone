'use client'

import { useState } from 'react'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Conversation, Message } from '@/lib/types'

interface ConversationRow extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
}

interface TranscriptViewProps {
  conversations: ConversationRow[]
  /** Async loader called when user clicks a conversation row. */
  loadMessages: (conversationId: string) => Promise<Message[]>
}

export function TranscriptView({ conversations, loadMessages }: TranscriptViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  async function handleSelect(id: string) {
    if (id === selectedId) {
      setSelectedId(null)
      setMessages([])
      return
    }
    setSelectedId(id)
    setLoading(true)
    try {
      const msgs = await loadMessages(id)
      setMessages(msgs)
    } finally {
      setLoading(false)
    }
  }

  const selected = conversations.find((c) => c.id === selectedId)

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <p className="text-sm font-medium">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        {conversations.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          <ul className="divide-y overflow-y-auto max-h-[600px]">
            {conversations.map((conv) => {
              const visitorShort = conv.visitor_id.slice(0, 8)
              const isActive = conv.id === selectedId
              return (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(conv.id)}
                    className={[
                      'w-full text-left px-4 py-3 transition-colors hover:bg-muted/50',
                      isActive ? 'bg-muted' : '',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {visitorShort}…
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(conv.last_message_at)}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Transcript panel */}
      <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
        {!selectedId ? (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
            Select a conversation to view its transcript
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">
                  Visitor {selected?.visitor_id.slice(0, 8)}…
                </span>
                {selected && (
                  <span className="ml-3 text-xs text-muted-foreground">
                    Started {formatDistanceToNow(selected.started_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[560px]">
              {loading ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  No messages
                </div>
              ) : (
                messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[75%] rounded-lg px-4 py-2.5 text-sm space-y-1',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        ].join(' ')}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Citations for assistant messages */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-current/20 pt-2">
            <p className="text-xs font-medium opacity-70">Sources:</p>
            {message.citations.map((citation, i) => (
              <blockquote
                key={i}
                className="text-xs opacity-60 italic border-l-2 border-current/30 pl-2"
              >
                {citation.snippet}
              </blockquote>
            ))}
          </div>
        )}

        <div className="text-xs opacity-50 mt-1">{message.role}</div>
      </div>
    </div>
  )
}
