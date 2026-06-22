'use client'

import { useState } from 'react'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Conversation, Message } from '@/lib/types'

interface ConversationRow extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
  summary: string | null
  topics: string[] | null
  needs_attention: boolean
  success_score: number | null
  success_reason: string | null
}

interface Analysis {
  summary: string
  topics: string[]
  successScore?: number
  successReason?: string
}

/** Color + label for a 1–5 success score (0/undefined = not rated). */
function scoreStyle(score: number | null | undefined): { label: string; cls: string } | null {
  if (!score) return null
  if (score >= 4) return { label: 'Success', cls: 'bg-green-100 text-green-800' }
  if (score === 3) return { label: 'Mixed', cls: 'bg-amber-100 text-amber-800' }
  return { label: 'Needs work', cls: 'bg-red-100 text-red-700' }
}

interface TranscriptViewProps {
  conversations: ConversationRow[]
  /** Async loader called when user clicks a conversation row. */
  loadMessages: (conversationId: string) => Promise<Message[]>
  /** Returns (and lazily generates) the AI summary/topics for a conversation. */
  analyze: (conversationId: string) => Promise<Analysis>
}

export function TranscriptView({ conversations, loadMessages, analyze }: TranscriptViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  async function handleSelect(id: string) {
    if (id === selectedId) {
      setSelectedId(null)
      setMessages([])
      setAnalysis(null)
      return
    }
    setSelectedId(id)
    setLoading(true)
    setAnalysis(null)
    const row = conversations.find((c) => c.id === id)
    try {
      const msgs = await loadMessages(id)
      setMessages(msgs)
    } finally {
      setLoading(false)
    }
    if (row?.summary) {
      setAnalysis({
        summary: row.summary,
        topics: row.topics ?? [],
        successScore: row.success_score ?? 0,
        successReason: row.success_reason ?? '',
      })
    } else {
      setAnalyzing(true)
      try {
        setAnalysis(await analyze(id))
      } finally {
        setAnalyzing(false)
      }
    }
  }

  const selected = conversations.find((c) => c.id === selectedId)
  const visible = attentionOnly ? conversations.filter((c) => c.needs_attention) : conversations
  const attentionCount = conversations.filter((c) => c.needs_attention).length

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
          <p className="text-sm font-medium">
            {visible.length} conversation{visible.length !== 1 ? 's' : ''}
          </p>
          {attentionCount > 0 && (
            <button
              type="button"
              onClick={() => setAttentionOnly((v) => !v)}
              className={[
                'text-xs font-medium rounded-full px-2.5 py-1 transition-colors',
                attentionOnly
                  ? 'bg-destructive/10 text-destructive'
                  : 'text-muted-foreground hover:bg-muted',
              ].join(' ')}
            >
              ⚠ Needs attention ({attentionCount})
            </button>
          )}
        </div>
        {visible.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            {attentionOnly ? 'Nothing needs attention' : 'No conversations yet'}
          </div>
        ) : (
          <ul className="divide-y overflow-y-auto max-h-[600px]">
            {visible.map((conv) => {
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
                      <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                        {conv.needs_attention && (
                          <span
                            className="size-1.5 rounded-full bg-destructive"
                            title="Needs attention"
                            aria-label="Needs attention"
                          />
                        )}
                        {visitorShort}…
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {conv.message_count} msg{conv.message_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(conv.last_message_at)}
                      </span>
                      {(() => {
                        const s = scoreStyle(conv.success_score)
                        return s ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${s.cls}`}
                            title={`AI handling: ${s.label}`}
                          >
                            {conv.success_score}/5
                          </span>
                        ) : null
                      })()}
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

            {/* AI summary + topics */}
            {(analyzing || analysis?.summary) && (
              <div className="px-4 py-3 border-b bg-muted/10 space-y-2">
                {analyzing && !analysis ? (
                  <p className="text-xs text-muted-foreground">Summarizing…</p>
                ) : (
                  <>
                    {(() => {
                      const s = scoreStyle(analysis?.successScore)
                      return s ? (
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
                            {analysis?.successScore}/5 {s.label}
                          </span>
                        </div>
                      ) : null
                    })()}
                    <p className="text-sm text-foreground">{analysis?.summary}</p>
                    {analysis?.successReason && (
                      <p className="text-xs text-muted-foreground italic">{analysis.successReason}</p>
                    )}
                    {analysis?.topics && analysis.topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.topics.map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

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
