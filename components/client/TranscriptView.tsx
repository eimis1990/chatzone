'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon } from 'lucide-react'
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

/** Small clipboard button — copies a value and flashes a check. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard?.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      title={label}
      aria-label={label}
      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <CheckIcon className="size-3.5 text-green-600" aria-hidden="true" />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden="true" />
      )}
    </button>
  )
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
    <div className="flex min-h-0 flex-1 gap-6">
      {/* Conversation list */}
      <div className="flex w-80 min-h-0 shrink-0 flex-col overflow-hidden rounded-lg border">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
          <p className="text-sm font-medium">
            {visible.length} conversation{visible.length !== 1 ? 's' : ''}
          </p>
          {attentionCount > 0 && (
            <button
              type="button"
              onClick={() => setAttentionOnly((v) => !v)}
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
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
          <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {attentionOnly ? 'Nothing needs attention' : 'No conversations yet'}
          </div>
        ) : (
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
            {visible.map((conv) => {
              const isActive = conv.id === selectedId
              const s = scoreStyle(conv.success_score)
              return (
                <li key={conv.id}>
                  <div
                    className={[
                      'flex items-start gap-1.5 px-2.5 py-3 transition-colors',
                      isActive ? 'bg-muted' : 'hover:bg-muted/50',
                    ].join(' ')}
                  >
                    <CopyButton value={conv.visitor_id} label="Copy conversation ID" />
                    <button
                      type="button"
                      onClick={() => handleSelect(conv.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        {conv.needs_attention && (
                          <span
                            className="size-1.5 shrink-0 rounded-full bg-destructive"
                            title="Needs attention"
                            aria-label="Needs attention"
                          />
                        )}
                        <span className="truncate font-mono text-xs text-foreground/80">
                          {conv.visitor_id}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(conv.last_message_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          {s && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${s.cls}`}
                              title={`AI handling: ${s.label}`}
                            >
                              {conv.success_score}/5
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                          </span>
                        </span>
                      </div>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Transcript panel */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        {!selectedId ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to view its transcript
          </div>
        ) : (
          <>
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-sm font-medium">
                  {selected?.visitor_id}
                </span>
                {selected && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    · started {formatDistanceToNow(selected.started_at)}
                  </span>
                )}
              </div>
              {selected && <CopyButton value={selected.visitor_id} label="Copy conversation ID" />}
            </div>

            {/* AI summary + topics */}
            {(analyzing || analysis?.summary) && (
              <div className="flex-shrink-0 space-y-2 border-b bg-muted/10 px-4 py-3">
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
                      <p className="text-xs italic text-muted-foreground">{analysis.successReason}</p>
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

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Loading…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  No messages
                </div>
              ) : (
                messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
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
  const products = message.products ?? []
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[80%] space-y-1 rounded-lg px-4 py-2.5 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        ].join(' ')}
      >
        {message.content && (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}

        {/* Suggested products the bot surfaced this turn */}
        {!isUser && products.length > 0 && (
          <div className="mt-2 space-y-1.5 border-t border-current/15 pt-2">
            <p className="text-xs font-medium opacity-70">
              Suggested product{products.length !== 1 ? 's' : ''}
            </p>
            {products.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md bg-background/70 p-1.5 text-foreground transition-colors hover:bg-background"
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="size-9 shrink-0 rounded object-cover" />
                ) : (
                  <div className="size-9 shrink-0 rounded bg-muted" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{p.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{p.price}</span>
                </span>
              </a>
            ))}
          </div>
        )}

        {/* Citations for assistant messages */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-current/20 pt-2">
            <p className="text-xs font-medium opacity-70">Sources:</p>
            {message.citations.map((citation, i) => (
              <blockquote
                key={i}
                className="border-l-2 border-current/30 pl-2 text-xs italic opacity-60"
              >
                {citation.snippet}
              </blockquote>
            ))}
          </div>
        )}

        <div className="mt-1 text-xs opacity-50">{message.role}</div>
      </div>
    </div>
  )
}
