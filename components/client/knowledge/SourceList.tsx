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
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

export function StatusBadge({ status, errorMessage }: { status: SourceStatus; errorMessage: string | null }) {
  const badge = (() => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <span className="size-1.5 rounded-full bg-yellow-500 inline-block" />
            Pending
          </Badge>
        )
      case 'processing':
        return (
          <Badge variant="secondary" className="gap-1">
            <span className="size-1.5 rounded-full bg-blue-500 inline-block animate-pulse" />
            Processing
          </Badge>
        )
      case 'ready':
        return (
          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-600">
            <span className="size-1.5 rounded-full bg-white inline-block" />
            Ready
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <span className="size-1.5 rounded-full bg-white/80 inline-block" />
            Error
          </Badge>
        )
    }
  })()

  if (status === 'error' && errorMessage) {
    return (
      <span
        title={errorMessage}
        className="inline-flex items-center gap-1 cursor-help"
        aria-label={`Error: ${errorMessage}`}
      >
        {badge}
        <AlertCircleIcon className="size-3.5 text-destructive shrink-0" aria-hidden="true" />
      </span>
    )
  }

  return badge
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function SourceList({ botId, sources, onDeleted, onUpdated }: SourceListProps) {
  // Track in-flight delete/retry per source id to disable buttons.
  const inflightRef = useRef<Set<string>>(new Set())
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sourcesRef = useRef(sources)
  sourcesRef.current = sources

  // The source open in the details drawer (tracked by id so it stays fresh as
  // the list updates from polling).
  const [viewingId, setViewingId] = useState<string | null>(null)
  const viewing = sources.find((s) => s.id === viewingId) ?? null

  // Poll while any source is still processing or pending.
  const poll = useCallback(async () => {
    const unsettled = sourcesRef.current.filter(
      (s) => !SETTLED_STATUSES.includes(s.status),
    )
    if (unsettled.length === 0) return

    try {
      const supabase = createBrowserClient()
      const ids = unsettled.map((s) => s.id)

      const { data: refreshed } = await supabase
        .from('knowledge_sources')
        .select('*')
        .in('id', ids)
        .returns<KnowledgeSource[]>()

      if (refreshed) {
        refreshed.forEach((updated) => onUpdated(updated))
      }
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
        // Re-check after poll: if still unsettled, schedule again.
        const stillUnsettled = sourcesRef.current.some(
          (s) => !SETTLED_STATUSES.includes(s.status),
        )
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
        const { error } = await supabase
          .from('knowledge_sources')
          .delete()
          .eq('id', source.id)

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

        // Reset status to pending so the user sees it queued.
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
    <Table>
      <TableHeader>
        <TableRow className="border-b hover:bg-transparent">
          <TableHead className="h-11 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</TableHead>
          <TableHead className="h-11 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</TableHead>
          <TableHead className="h-11 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</TableHead>
          <TableHead className="h-11 px-5 text-xs font-medium uppercase tracking-wide text-muted-foreground">Added</TableHead>
          <TableHead className="h-11 px-5 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sources.map((source) => {
          const { label, icon: TypeIcon } = TYPE_META[source.type]
          return (
            <TableRow
              key={source.id}
              onClick={() => setViewingId(source.id)}
              className="cursor-pointer transition-colors hover:bg-muted/40"
            >
              <TableCell className="max-w-xs truncate px-5 py-3.5 font-medium" title={source.name}>
                {source.name}
              </TableCell>
              <TableCell className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TypeIcon className="size-3.5" aria-hidden="true" />
                  {label}
                </span>
              </TableCell>
              <TableCell className="px-5 py-3.5">
                <StatusBadge status={source.status} errorMessage={source.error_message} />
              </TableCell>
              <TableCell className="px-5 py-3.5 text-xs text-muted-foreground">
                {formatDate(source.created_at)}
              </TableCell>
              <TableCell className="px-5 py-3.5 text-right">
                <div className="flex items-center justify-end gap-1">
                  {source.status === 'error' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRetry(source)
                      }}
                      aria-label={`Retry ingestion for "${source.name}"`}
                      title="Retry ingestion"
                    >
                      <RefreshCwIcon />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(source)
                    }}
                    aria-label={`Delete "${source.name}"`}
                    title="Delete source"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>

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
