'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon, PhoneIcon, MessageCircleIcon, ChevronLeftIcon, TriangleAlertIcon } from 'lucide-react'
import { VisitorBlockManagementCard } from '@/components/client/VisitorBlockManagementCard'
import { formatDistanceToNow } from '@/lib/date-utils'
import type {
  VisitorBlockManagementAction,
  VisitorBlockManagementResult,
} from '@/lib/visitor-block-shared'
import type { Conversation, ConversationChannel, Message } from '@/lib/types'

interface ConversationRow
  extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
  summary: string | null
  topics: string[] | null
  needs_attention: boolean
  success_score: number | null
  success_reason: string | null
  channel: ConversationChannel
  block_expires_at: string | null
}

/** Small pill marking whether a conversation was a voice call or a text chat.
 *  Voice = lime, Chat = teal, both white text + a filled icon. (600 shades so
 *  white stays legible on the fill — lime-500 fails contrast.) */
function ChannelBadge({ channel }: { channel: ConversationChannel }) {
  const voice = channel === 'voice'
  const Icon = voice ? PhoneIcon : MessageCircleIcon
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white ${
        voice ? 'bg-lime-600' : 'bg-teal-600'
      }`}
      title={voice ? 'Voice call' : 'Text chat'}
    >
      <Icon className="size-2.5" fill="currentColor" stroke="currentColor" aria-hidden="true" />
      {voice ? 'Voice' : 'Chat'}
    </span>
  )
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

/** The chat's AI-handling rating as a labeled pill (nothing when unscored). */
function RatingBadge({ score }: { score: number | null | undefined }) {
  const s = scoreStyle(score)
  if (!s) return null
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}
      title={`AI handling: ${s.label}`}
    >
      {s.label}
      <span className="opacity-70">{score}/5</span>
    </span>
  )
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
  /** Unblocks or extends the selected visitor's active block. */
  manageVisitorBlock: (
    conversationId: string,
    action: VisitorBlockManagementAction,
  ) => Promise<VisitorBlockManagementResult>
}

export function TranscriptView({
  conversations,
  loadMessages,
  analyze,
  manageVisitorBlock,
}: TranscriptViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Mobile: chat transcript vs AI review are shown one at a time via a segmented
  // control (desktop shows both side by side).
  const [mobileTab, setMobileTab] = useState<'chat' | 'review'>('chat')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [blockOverrides, setBlockOverrides] = useState<Record<string, string | null>>({})

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
  const selectedBlockExpiresAt = selected
    ? Object.hasOwn(blockOverrides, selected.visitor_id)
      ? blockOverrides[selected.visitor_id]
      : selected.block_expires_at
    : null
  const visible = attentionOnly ? conversations.filter((c) => c.needs_attention) : conversations
  const attentionCount = conversations.filter((c) => c.needs_attention).length

  return (
    <div className="flex min-h-0 flex-1 gap-0 md:gap-6">
      {/* Conversation list — full-bleed on mobile (no card border/radius); a
          bordered side column at md+. Hidden once a transcript is open. */}
      <div
        className={`flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-0 bg-card md:w-80 md:rounded-lg md:border ${selectedId ? 'hidden md:flex' : ''}`}
      >
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
              return (
                <li
                  key={conv.id}
                  className={`relative overflow-hidden ${conv.needs_attention ? 'attention-cell' : ''}`}
                >
                  {/* Whole cell selects the conversation. Selection/hover use a
                      translucent wash so the attention glow shows through. */}
                  <button
                    type="button"
                    onClick={() => {
                      handleSelect(conv.id)
                      setMobileTab('chat')
                    }}
                    className={[
                      'relative z-[1] block w-full px-3 py-3 text-left transition-colors',
                      isActive ? 'bg-muted/70' : 'hover:bg-muted/40',
                    ].join(' ')}
                  >
                    {/* Top row: channel badge (+ attention flag) · message count */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ChannelBadge channel={conv.channel} />
                        {conv.needs_attention && (
                          <span
                            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                            title="Needs attention — the visitor was unhappy or the bot couldn't answer"
                            aria-label="Needs attention"
                          >
                            <TriangleAlertIcon className="size-3" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Bottom row: time · AI-handling rating */}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDistanceToNow(conv.last_message_at)}
                      </span>
                      <RatingBadge score={conv.success_score} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Transcript panel — full-bleed on mobile; hidden until a conversation
          is picked. Bordered card at md+. */}
      <div
        className={`flex min-h-0 flex-1 flex-col overflow-hidden border-0 bg-card md:rounded-lg md:border ${!selectedId ? 'hidden md:flex' : ''}`}
      >
        {!selectedId ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation to view its transcript
          </div>
        ) : (
          <>
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b bg-muted/30 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Back to list"
                  className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
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

            {/* Mobile: switch between chat and review (desktop shows both). */}
            <div className="flex flex-shrink-0 gap-1 border-b p-2 md:hidden">
              {(['chat', 'review'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMobileTab(t)}
                  className={[
                    'flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors',
                    mobileTab === t ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  {t === 'chat' ? 'Chat' : 'Review'}
                </button>
              ))}
            </div>

            {/* Body: transcript (60%) + AI review (40%), each scrolls on its own.
                On mobile only the segmented-tab-selected pane shows. */}
            <div className="flex min-h-0 flex-1">
              <div
                className={`min-h-0 flex-[3] space-y-4 overflow-y-auto p-4 md:block ${mobileTab === 'chat' ? 'block' : 'hidden'}`}
              >
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

              {/* AI review / evaluation */}
              <aside
                className={`min-h-0 flex-[2] flex-col border-l bg-muted/10 md:flex ${mobileTab === 'review' ? 'flex' : 'hidden'}`}
              >
                <div className="hidden flex-shrink-0 border-b px-4 py-3 md:block">
                  <h3 className="text-sm font-semibold">Conversation review</h3>
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                  {selected && selectedBlockExpiresAt && (
                    <VisitorBlockManagementCard
                      expiresAt={selectedBlockExpiresAt}
                      onAction={(action) => manageVisitorBlock(selected.id, action)}
                      onChange={(expiresAt) =>
                        setBlockOverrides((current) => ({
                          ...current,
                          [selected.visitor_id]: expiresAt,
                        }))
                      }
                    />
                  )}
                  {analyzing && !analysis ? (
                    <p className="text-xs text-muted-foreground">Analyzing conversation…</p>
                  ) : analysis?.summary ? (
                    <>
                      {(() => {
                        const s = scoreStyle(analysis?.successScore)
                        return s ? (
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
                            {analysis?.successScore}/5 {s.label}
                          </span>
                        ) : null
                      })()}
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Summary</p>
                        <p className="text-sm text-foreground">{analysis.summary}</p>
                      </div>
                      {analysis?.successReason && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Assessment</p>
                          <p className="text-sm italic text-muted-foreground">{analysis.successReason}</p>
                        </div>
                      )}
                      {analysis?.topics && analysis.topics.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-muted-foreground">Topics</p>
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
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No review available for this conversation.
                    </p>
                  )}
                </div>
              </aside>
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
  // A reply the visitor thumbed-down: outline it so the owner can spot exactly
  // which answer missed (ring, so there's no layout shift vs. other bubbles).
  const disliked = message.feedback === 'down'
  return (
    <div className={['flex', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[80%] space-y-1 rounded-lg px-4 py-2.5 text-sm',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
          disliked ? 'ring-2 ring-destructive/70' : '',
        ].join(' ')}
        title={disliked ? 'Visitor marked this reply unhelpful' : undefined}
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
