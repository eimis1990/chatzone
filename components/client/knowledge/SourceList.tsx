'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from 'sonner'
import {
  RefreshCwIcon,
  Trash2Icon,
  AlertCircleIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  LinkIcon,
  PaperclipIcon,
  DatabaseIcon,
  MoreVerticalIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from '@/lib/date-utils'
import { createBrowserClient } from '@/lib/supabase/browser'
import { SourceDrawer } from './SourceDrawer'
import type { KnowledgeSource, SourceStatus, SourceType } from '@/lib/types'

interface SourceListProps {
  botId: string
  sources: KnowledgeSource[]
  onDeleted: (sourceId: string) => void
  onUpdated: (source: KnowledgeSource) => void
}

const POLL_INTERVAL_MS = 3000
const SETTLED_STATUSES: SourceStatus[] = ['ready', 'error']

export const TYPE_META: Record<SourceType, { label: string; icon: LucideIcon }> = {
  text: { label: 'Text', icon: FileTextIcon },
  qa: { label: 'Q&A', icon: MessageSquareTextIcon },
  url: { label: 'URL', icon: LinkIcon },
  file: { label: 'File', icon: PaperclipIcon },
}

// Subtle per-type icon tile (colour-codes the source kind at a glance).
const TYPE_TILE: Record<SourceType, string> = {
  text: 'bg-blue-50 text-blue-600',
  qa: 'bg-violet-50 text-violet-600',
  url: 'bg-cyan-50 text-cyan-600',
  file: 'bg-slate-100 text-slate-600',
}

const STATUS_STYLE: Record<
  SourceStatus,
  { label: string; cls: string; dot: string; pulse?: boolean }
> = {
  pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  processing: { label: 'Indexing…', cls: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500', pulse: true },
  ready: { label: 'Ready', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  error: { label: 'Failed', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
}

export function StatusBadge({ status, errorMessage }: { status: SourceStatus; errorMessage: string | null }) {
  const s = STATUS_STYLE[status]
  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
        s.cls,
      )}
    >
      <span className={cn('size-1.5 rounded-full', s.dot, s.pulse && 'animate-pulse')} />
      {s.label}
    </span>
  )

  if (status === 'error' && errorMessage) {
    return (
      <span
        title={errorMessage}
        className="inline-flex cursor-help items-center gap-1"
        aria-label={`Error: ${errorMessage}`}
      >
        {badge}
        <AlertCircleIcon className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
      </span>
    )
  }

  return badge
}

/** A short, human description for the card from the source's metadata. */
function sourceSubtitle(source: KnowledgeSource): string {
  const m = (source.metadata ?? {}) as Record<string, unknown>
  switch (source.type) {
    case 'url':
      return typeof m.url === 'string' ? m.url : 'Linked web page'
    case 'qa': {
      const n = Array.isArray(m.pairs) ? m.pairs.length : 0
      return `${n} question & answer ${n === 1 ? 'pair' : 'pairs'}`
    }
    case 'text':
      return typeof m.content === 'string' && m.content.trim()
        ? m.content.replace(/\s+/g, ' ').trim()
        : 'Pasted text'
    case 'file': {
      const ext = source.name.includes('.') ? source.name.split('.').pop()?.toUpperCase() : ''
      return ext && ext.length <= 4 ? `${ext} file` : 'Uploaded file'
    }
    default:
      return ''
  }
}

/** Kebab menu for a card (Retry on errors + Delete). Stops row-click propagation. */
function CardMenu({
  canRetry,
  disabled,
  onRetry,
  onDelete,
}: {
  canRetry: boolean
  disabled: boolean
  onRetry: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen((o) => !o)}
        aria-label="Source actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVerticalIcon />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        >
          {canRetry && (
            <button
              type="button"
              role="menuitem"
              disabled={disabled}
              onClick={() => {
                setOpen(false)
                onRetry()
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCwIcon className="size-4" /> Retry
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <Trash2Icon className="size-4" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

export function SourceList({ sources, onDeleted, onUpdated }: SourceListProps) {
  // Track in-flight delete/retry per source id to disable buttons.
  const inflightRef = useRef<Set<string>>(new Set())
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  // Chunk counts per ready source (shown as the "N chunks" badge).
  const [counts, setCounts] = useState<Record<string, number>>({})
  const countsRef = useRef(counts)
  countsRef.current = counts

  // The source open in the details drawer (tracked by id so it stays fresh as
  // the list updates from polling).
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing = sources.find((s) => s.id === viewingId) ?? null

  // Fetch chunk counts for newly-ready sources; prune stale ones (so a
  // re-indexed source refetches a fresh count once it settles again).
  useEffect(() => {
    const supabase = createBrowserClient()
    let cancelled = false

    const readyIds = new Set(sources.filter((s) => s.status === 'ready').map((s) => s.id))
    const hasStale = Object.keys(countsRef.current).some((id) => !readyIds.has(id))
    if (hasStale) {
      setCounts((prev) => {
        const next: Record<string, number> = {}
        for (const id of Object.keys(prev)) if (readyIds.has(id)) next[id] = prev[id]
        return next
      })
    }

    const missing = sources.filter(
      (s) => s.status === 'ready' && countsRef.current[s.id] === undefined,
    )
    if (missing.length > 0) {
      Promise.all(
        missing.map(async (s) => {
          const { count } = await supabase
            .from('document_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('source_id', s.id)
          return [s.id, count ?? 0] as const
        }),
      ).then((pairs) => {
        if (!cancelled) setCounts((prev) => ({ ...prev, ...Object.fromEntries(pairs) }))
      })
    }

    return () => {
      cancelled = true
    }
  }, [sources])

  // Poll while any source is still processing or pending.
  const poll = useCallback(async () => {
    const unsettled = sourcesRef.current.filter((s) => !SETTLED_STATUSES.includes(s.status))
    if (unsettled.length === 0) return

    try {
      const supabase = createBrowserClient()
      const ids = unsettled.map((s) => s.id)
      const { data: refreshed } = await supabase
        .from('knowledge_sources')
        .select('*')
        .in('id', ids)
        .returns<KnowledgeSource[]>()
      if (refreshed) refreshed.forEach((updated) => onUpdated(updated))
    } catch {
      // Ignore poll errors — we'll try again next tick.
    }
  }, [onUpdated])

  useEffect(() => {
    const hasUnsettled = sources.some((s) => !SETTLED_STATUSES.includes(s.status))
    if (!hasUnsettled) {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    function schedule() {
      pollTimerRef.current = setTimeout(async () => {
        await poll()
        const stillUnsettled = sourcesRef.current.some((s) => !SETTLED_STATUSES.includes(s.status))
        if (stillUnsettled) schedule()
      }, POLL_INTERVAL_MS)
    }

    schedule()

    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [sources, poll])

  const handleDelete = useCallback(
    async (source: KnowledgeSource) => {
      if (inflightRef.current.has(source.id)) return
      inflightRef.current.add(source.id)
      try {
        const supabase = createBrowserClient()
        const { error } = await supabase.from('knowledge_sources').delete().eq('id', source.id)
        if (error) throw new Error(error.message)
        onDeleted(source.id)
        toast.success(`"${source.name}" deleted`)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete source')
      } finally {
        inflightRef.current.delete(source.id)
      }
    },
    [onDeleted],
  )

  const handleRetry = useCallback(
    async (source: KnowledgeSource) => {
      if (inflightRef.current.has(source.id)) return
      inflightRef.current.add(source.id)
      try {
        const supabase = createBrowserClient()
        const { data: reset, error: resetError } = await supabase
          .from('knowledge_sources')
          .update({ status: 'pending', error_message: null })
          .eq('id', source.id)
          .select('*')
          .single<KnowledgeSource>()
        if (resetError || !reset) throw new Error(resetError?.message ?? 'Reset failed')
        onUpdated(reset)

        const res = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
        if (!res.ok) throw new Error('Ingestion request failed')
        toast.success('Ingestion restarted')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to retry ingestion')
      } finally {
        inflightRef.current.delete(source.id)
      }
    },
    [onUpdated],
  )

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <DatabaseIcon className="size-5" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">No sources yet</p>
          <p className="text-sm text-muted-foreground">Add one on the left to start training your bot.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 p-4">
        {sources.map((source) => {
          const { label, icon: TypeIcon } = TYPE_META[source.type]
          const subtitle = sourceSubtitle(source)
          const chunks = counts[source.id]
          return (
            <div
              key={source.id}
              role="button"
              tabIndex={0}
              onClick={() => setViewingId(source.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setViewingId(source.id)
                }
              }}
              className="group flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-foreground/15 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="flex items-start justify-between">
                <span
                  className={cn(
                    'flex size-10 items-center justify-center rounded-lg',
                    TYPE_TILE[source.type],
                  )}
                  title={label}
                >
                  <TypeIcon className="size-5" aria-hidden="true" />
                </span>
                <CardMenu
                  canRetry={source.status === 'error'}
                  disabled={inflightRef.current.has(source.id)}
                  onRetry={() => handleRetry(source)}
                  onDelete={() => handleDelete(source)}
                />
              </div>

              <div className="min-w-0">
                <p className="truncate font-medium text-foreground" title={source.name}>
                  {source.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(source.created_at)}
                </span>
                {source.status === 'ready' && chunks !== undefined ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {chunks} {chunks === 1 ? 'chunk' : 'chunks'}
                  </span>
                ) : (
                  <StatusBadge status={source.status} errorMessage={source.error_message} />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <SourceDrawer
        source={viewing}
        onClose={() => setViewingId(null)}
        onRetry={handleRetry}
        onDelete={(s) => {
          handleDelete(s)
          setViewingId(null)
        }}
      />
    </>
  )
}
