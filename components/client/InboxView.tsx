'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HeadsetIcon,
  SendIcon,
  CheckCheckIcon,
  CornerUpLeftIcon,
  HandIcon,
  RefreshCwIcon,
  CircleDotIcon,
  ChevronLeftIcon,
} from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { HandoffStatus, Message } from '@/lib/types'
import type { HandoffAction } from '@/lib/handoff'

export interface InboxItem {
  id: string
  visitor_id: string
  handoff_status: HandoffStatus
  handoff_requested_at: string | null
  last_message_at: string
  assigned_to: string | null
  preview: string
}

type Filter = 'open' | 'resolved' | 'all'

interface InboxViewProps {
  /** Scope the realtime channel to one bot; omit for a cross-bot (org) inbox. */
  botId?: string | null
  initialList: InboxItem[]
  loadList: () => Promise<InboxItem[]>
  loadThread: (conversationId: string) => Promise<Message[]>
  sendAgentMessage: (
    conversationId: string,
    content: string,
  ) => Promise<{ id: string; content: string; created_at: string } | null>
  handoffAction: (conversationId: string, action: HandoffAction) => Promise<{ status: HandoffStatus }>
}

const STATUS_STYLE: Record<HandoffStatus, { label: string; cls: string }> = {
  bot: { label: 'Bot', cls: 'bg-muted text-muted-foreground' },
  requested: { label: 'Needs human', cls: 'bg-amber-100 text-amber-800' },
  live: { label: 'Live', cls: 'bg-primary/15 text-primary' },
  resolved: { label: 'Resolved', cls: 'bg-muted text-muted-foreground' },
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function InboxView({
  botId,
  initialList,
  loadList,
  loadThread,
  sendAgentMessage,
  handoffAction,
}: InboxViewProps) {
  const [list, setList] = useState<InboxItem[]>(initialList)
  const [filter, setFilter] = useState<Filter>('open')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setList(await loadList())
  }, [loadList])

  const selected = list.find((c) => c.id === selectedId) ?? null
  const openCount = list.filter((c) => c.handoff_status === 'requested' || c.handoff_status === 'live').length

  const filtered = list.filter((c) => {
    if (filter === 'open') return c.handoff_status === 'requested' || c.handoff_status === 'live'
    if (filter === 'resolved') return c.handoff_status === 'resolved'
    return true
  })

  // Realtime: refresh the list when a relevant conversation changes. With a
  // botId we filter to that bot; without one (cross-bot org inbox) we listen to
  // all conversation changes — RLS still limits payloads to the user's orgs,
  // and the poll below covers any gaps.
  useEffect(() => {
    const supabase = createBrowserClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      await supabase.auth.getSession()
      if (cancelled) return
      channel = supabase
        .channel(botId ? `inbox:${botId}` : 'inbox:org')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            ...(botId ? { filter: `bot_id=eq.${botId}` } : {}),
          },
          () => {
            refresh()
          },
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [botId, refresh])

  // Fallback poll in case the Realtime socket is unavailable.
  useEffect(() => {
    const t = setInterval(() => {
      refresh()
    }, 8000)
    return () => clearInterval(t)
  }, [refresh])

  // Realtime: append new messages in the open thread.
  useEffect(() => {
    if (!selectedId) return
    const supabase = createBrowserClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    ;(async () => {
      await supabase.auth.getSession()
      if (cancelled) return
      channel = supabase
        .channel(`thread:${selectedId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedId}` },
          (payload) => {
            const m = payload.new as Message
            setThread((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
          },
        )
        .subscribe()
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const select = useCallback(
    async (id: string) => {
      setSelectedId(id)
      setThread(await loadThread(id))
    },
    [loadThread],
  )

  const onSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    setDraft('')
    const msg = await sendAgentMessage(selectedId, text)
    if (msg) {
      setThread((prev) =>
        prev.some((x) => x.id === msg.id)
          ? prev
          : [
              ...prev,
              {
                id: msg.id,
                conversation_id: selectedId,
                role: 'assistant',
                content: msg.content,
                citations: [],
                token_count: null,
                created_at: msg.created_at,
                from_human: true,
              } as Message,
            ],
      )
    }
    await refresh()
    setSending(false)
  }, [draft, selectedId, sending, sendAgentMessage, refresh])

  const act = useCallback(
    async (action: HandoffAction) => {
      if (!selectedId) return
      await handoffAction(selectedId, action)
      await refresh()
    },
    [selectedId, handoffAction, refresh],
  )

  const selectedStatus = selected?.handoff_status ?? 'bot'

  return (
    <div className="flex min-h-0 flex-1 gap-0 md:gap-4">
      {/* Conversation list — full-bleed on mobile (no card border/radius);
          bordered side column at md+. Hidden once a thread is open. */}
      <div
        className={cn(
          'flex min-h-0 w-full flex-shrink-0 flex-col overflow-hidden border-0 bg-card md:w-80 md:rounded-xl md:border',
          selectedId && 'hidden md:flex',
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b p-3">
          <div className="flex gap-1">
            {(['open', 'resolved', 'all'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
                  filter === f ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {f}
                {f === 'open' && openCount > 0 ? ` (${openCount})` : ''}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh"
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCwIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {filter === 'open' ? 'No conversations need a human right now.' : 'Nothing here.'}
            </p>
          )}
          {filtered.map((c) => {
            const s = STATUS_STYLE[c.handoff_status]
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => select(c.id)}
                className={cn(
                  'flex w-full flex-col gap-1 border-b px-3 py-2.5 text-left transition-colors',
                  selectedId === c.id ? 'bg-primary/5' : 'hover:bg-muted/50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {c.visitor_id.slice(0, 8)}
                  </span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', s.cls)}>{s.label}</span>
                </div>
                <p className="truncate text-sm text-foreground/90">{c.preview || '—'}</p>
                <span className="text-[10px] text-muted-foreground">
                  {timeAgo(c.handoff_requested_at ?? c.last_message_at)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread — full-bleed on mobile; hidden until a conversation is picked. */}
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-0 bg-card md:rounded-xl md:border',
          !selectedId && 'hidden md:flex',
        )}
      >
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <HeadsetIcon className="size-8 opacity-40" />
            <p className="text-sm">Select a conversation to view and reply.</p>
          </div>
        ) : (
          <>
            {/* Thread header + controls */}
            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-2 border-b p-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Back to list"
                  className="-ml-1 shrink-0 text-muted-foreground hover:text-foreground md:hidden"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <CircleDotIcon
                  className={cn(
                    'size-4',
                    selectedStatus === 'live'
                      ? 'text-primary'
                      : selectedStatus === 'requested'
                        ? 'text-amber-500'
                        : 'text-muted-foreground',
                  )}
                />
                <span className="font-mono text-sm">{selected.visitor_id.slice(0, 12)}</span>
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', STATUS_STYLE[selectedStatus].cls)}>
                  {STATUS_STYLE[selectedStatus].label}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedStatus === 'requested' && (
                  <Button size="sm" onClick={() => act('take')}>
                    <HandIcon className="size-4" />
                    Take over
                  </Button>
                )}
                {(selectedStatus === 'live' || selectedStatus === 'requested') && (
                  <Button size="sm" variant="outline" onClick={() => act('return')}>
                    <CornerUpLeftIcon className="size-4" />
                    Return to bot
                  </Button>
                )}
                {selectedStatus === 'live' && (
                  <Button size="sm" variant="outline" onClick={() => act('resolve')}>
                    <CheckCheckIcon className="size-4" />
                    Resolve
                  </Button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {thread.map((m) => {
                const isUser = m.role === 'user'
                return (
                  <div key={m.id} className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
                    <div
                      className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                        isUser
                          ? 'bg-muted text-foreground'
                          : m.from_human
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-secondary-foreground',
                      )}
                    >
                      {!isUser && (
                        <span className="mb-0.5 block text-[10px] font-medium opacity-70">
                          {m.from_human ? 'Agent' : 'Bot'}
                        </span>
                      )}
                      <span className="whitespace-pre-wrap">{m.content}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="flex flex-shrink-0 items-end gap-2 border-t p-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                rows={1}
                placeholder="Type a reply… (Enter to send)"
                className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button onClick={onSend} disabled={sending || !draft.trim()}>
                <SendIcon className="size-4" />
                Send
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
