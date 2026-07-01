'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XIcon, RefreshCwIcon, Trash2Icon, ExternalLinkIcon, SaveIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'
import { TYPE_META, StatusBadge } from './SourceList'

interface SourceDrawerProps {
  source: KnowledgeSource | null
  onClose: () => void
  onDelete: (source: KnowledgeSource) => void
  onRetry: (source: KnowledgeSource) => void
  onUpdated: (source: KnowledgeSource) => void
}

/**
 * Shows the exact text that was indexed for a source (its chunks, joined) and
 * lets the owner/client edit it. Saving stores the edit as a content override
 * and re-indexes (re-chunk + re-embed) via /api/ingest.
 */
function IndexedContent({
  source,
  onUpdated,
}: {
  source: KnowledgeSource
  onUpdated: (s: KnowledgeSource) => void
}) {
  const [loading, setLoading] = useState(true)
  const [original, setOriginal] = useState('')
  const [text, setText] = useState('')
  const [chunkCount, setChunkCount] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const supabase = createBrowserClient()
      const { data } = await supabase
        .from('document_chunks')
        .select('content, chunk_index')
        .eq('source_id', source.id)
        .order('chunk_index', { ascending: true })
      const rows = (data ?? []) as { content: string }[]
      const joined = rows.map((c) => c.content).join('\n\n')
      if (!cancelled) {
        setOriginal(joined)
        setText(joined)
        setChunkCount(rows.length)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source.id, source.status])

  const dirty = text !== original

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const supabase = createBrowserClient()
      const meta = { ...((source.metadata ?? {}) as Record<string, unknown>), contentOverride: text }
      const { data: updated, error } = await supabase
        .from('knowledge_sources')
        .update({ metadata: meta, status: 'pending', error_message: null })
        .eq('id', source.id)
        .select('*')
        .single<KnowledgeSource>()
      if (error || !updated) throw new Error(error?.message ?? 'Save failed')
      onUpdated(updated)
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id }),
      })
      if (!res.ok) throw new Error('Re-index failed')
      const { data: fin } = await supabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', source.id)
        .single<KnowledgeSource>()
      if (fin) onUpdated(fin)
      setOriginal(text)
      toast.success('Saved and re-indexed')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [source, text, onUpdated])

  if (loading) return <p className="text-sm text-muted-foreground">Loading indexed content…</p>

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Indexed content · {chunkCount} chunk{chunkCount === 1 ? '' : 's'}
        </span>
        {dirty && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setText(original)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
              Save &amp; re-index
            </Button>
          </div>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        spellCheck={false}
        className="w-full resize-y rounded-lg border bg-background p-3 text-sm leading-relaxed [overflow-wrap:anywhere] focus:outline-none focus:ring-2 focus:ring-primary/30"
        placeholder={
          source.status === 'ready' ? 'No text was indexed for this source.' : 'Not indexed yet.'
        }
      />
      <p className="text-xs text-muted-foreground">
        This is the exact text the AI searches. Edit it and re-index to correct or enrich what the
        bot knows.
      </p>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Read-only details of a knowledge source rendered per type. */
function SourceContent({ source }: { source: KnowledgeSource }) {
  const m = (source.metadata ?? {}) as Record<string, unknown>

  if (source.type === 'text') {
    const content = String(m.content ?? '')
    return (
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-3 font-sans text-sm leading-relaxed text-foreground">
        {content || 'No content stored.'}
      </pre>
    )
  }

  if (source.type === 'qa') {
    const pairs = (Array.isArray(m.pairs) ? m.pairs : []) as { question: string; answer: string }[]
    if (pairs.length === 0) return <p className="text-sm text-muted-foreground">No Q&amp;A pairs stored.</p>
    return (
      <div className="space-y-3">
        {pairs.map((p, i) => (
          <div key={i} className="rounded-lg border p-3">
            <p className="text-sm font-medium text-foreground">{p.question}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{p.answer}</p>
          </div>
        ))}
      </div>
    )
  }

  if (source.type === 'url') {
    const url = String(m.url ?? '')
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 break-all rounded-lg bg-muted/50 p-3 text-sm text-primary hover:underline"
      >
        <ExternalLinkIcon className="size-4 shrink-0" aria-hidden="true" />
        {url || 'No URL stored.'}
      </a>
    )
  }

  // file
  const path = String(m.path ?? '')
  const mime = String(m.mime ?? '')
  return (
    <dl className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">File</dt>
        <dd className="truncate font-medium" title={source.name}>{source.name}</dd>
      </div>
      {mime && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Type</dt>
          <dd className="font-mono text-xs">{mime}</dd>
        </div>
      )}
      {path && (
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Path</dt>
          <dd className="truncate font-mono text-xs" title={path}>{path}</dd>
        </div>
      )}
    </dl>
  )
}

export function SourceDrawer({ source, onClose, onDelete, onRetry, onUpdated }: SourceDrawerProps) {
  // Close on Escape.
  useEffect(() => {
    if (!source) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [source, onClose])

  const TypeIcon = source ? TYPE_META[source.type].icon : null

  return (
    <AnimatePresence>
      {source && (
        <>
          <motion.div
            key="source-drawer-backdrop"
            className="fixed inset-0 z-50 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="source-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Source: ${source.name}`}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* Header (static) */}
            <div className="flex flex-shrink-0 items-start justify-between gap-3 border-b p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {TypeIcon && <TypeIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <h2 className="truncate text-base font-semibold" title={source.name}>
                    {source.name}
                  </h2>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={source.status} errorMessage={source.error_message} />
                  <span className="text-xs text-muted-foreground">{TYPE_META[source.type].label}</span>
                  <span className="text-xs text-muted-foreground">· Added {formatDate(source.created_at)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Content (scrolls) */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              {source.status === 'error' && source.error_message && (
                <div className="whitespace-pre-wrap rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive [overflow-wrap:anywhere]">
                  {source.error_message}
                </div>
              )}
              {/* Source reference (the URL / file); the indexed text is shown + editable below. */}
              {(source.type === 'url' || source.type === 'file') && <SourceContent source={source} />}
              <IndexedContent source={source} onUpdated={onUpdated} />
            </div>

            {/* Actions (static) */}
            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t p-4">
              {source.status === 'error' && (
                <Button variant="outline" size="sm" onClick={() => onRetry(source)}>
                  <RefreshCwIcon className="size-4" />
                  Retry
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(source)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
                Delete
              </Button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
