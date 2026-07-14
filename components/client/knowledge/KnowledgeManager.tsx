'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { FileTextIcon, MessageSquareTextIcon, GlobeIcon, UploadIcon, XIcon, WandSparklesIcon, SearchCheckIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/browser'
import { TextSource } from './TextSource'
import { QaSource } from './QaSource'
import { UrlSource } from './UrlSource'
import { FileUpload } from './FileUpload'
import { SourceList } from './SourceList'
import { LintResults } from './LintResults'
import { LintResolveDialog } from './LintResolveDialog'
import type { KnowledgeSource, LintFinding } from '@/lib/types'

interface KnowledgeManagerProps {
  botId: string
  initialSources: KnowledgeSource[]
  /**
   * Who is managing the sources. Website training is a done-for-you (paid,
   * one-time-setup) feature, so the "Website" tab is owner-only — clients see
   * only Text / Q&A / File. Defaults to 'owner'.
   */
  audience?: 'owner' | 'client'
}

const SOURCE_TABS = [
  { value: 'url', label: 'Website', icon: GlobeIcon },
  { value: 'text', label: 'Text', icon: FileTextIcon },
  { value: 'qa', label: 'Q&A', icon: MessageSquareTextIcon },
  { value: 'file', label: 'File', icon: UploadIcon },
] as const

export function KnowledgeManager({ botId, initialSources }: KnowledgeManagerProps) {
  // Self-serve first: clients crawl their own site (the onboarding wizard
  // already does), so every source type is available to both audiences.
  const tabs = SOURCE_TABS
  const defaultTab = tabs[0].value
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources)
  const [addOpen, setAddOpen] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [linting, setLinting] = useState(false)
  const [lint, setLint] = useState<{ findings: LintFinding[]; scanned: number } | null>(null)
  // The finding open in the guided resolution dialog.
  const [resolving, setResolving] = useState<LintFinding | null>(null)

  // Remove a finding from the panel (after it's resolved or dismissed).
  const removeFinding = useCallback((fingerprint: string) => {
    setLint((prev) =>
      prev ? { ...prev, findings: prev.findings.filter((f) => f.id !== fingerprint) } : prev,
    )
  }, [])

  // Scan the KB for contradictions / stale content / gaps (read-only).
  const handleCheckIssues = useCallback(async () => {
    setLinting(true)
    try {
      const res = await fetch('/api/knowledge/lint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      })
      const data = (await res.json()) as { findings?: LintFinding[]; scanned?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Scan failed')
      setLint({ findings: data.findings ?? [], scanned: data.scanned ?? 0 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLinting(false)
    }
  }, [botId])

  // Dismiss a finding: remove it now (optimistic) and persist per bot so it
  // stays gone across scans/sessions. A failed persist just means the next scan
  // may resurface it — not worth blocking the UI on.
  const handleDismiss = useCallback(
    async (fingerprint: string) => {
      removeFinding(fingerprint)
      try {
        await fetch('/api/knowledge/lint/dismiss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId, fingerprint }),
        })
      } catch {
        // Optimistic — persistence is best-effort.
      }
    },
    [botId, removeFinding],
  )

  // Re-fetch the full source list (canonical summaries are created server-side).
  const refreshSources = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('bot_id', botId)
      .order('created_at', { ascending: false })
      .returns<KnowledgeSource[]>()
    if (data) setSources(data)
  }, [botId])

  // Synthesize/refresh the canonical "answer summary" pages from current content.
  const handleRebuildSummaries = useCallback(async () => {
    setSummarizing(true)
    try {
      const res = await fetch('/api/knowledge/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId }),
      })
      const data = (await res.json()) as { built?: number; skipped?: number; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to build summaries')
      await refreshSources()
      toast.success(
        data.built
          ? `Built ${data.built} answer ${data.built === 1 ? 'summary' : 'summaries'}`
          : 'No topics had enough content to summarize yet',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to build summaries')
    } finally {
      setSummarizing(false)
    }
  }, [botId, refreshSources])

  // Called by each add-source component after it creates a row + triggers ingest.
  const handleSourceAdded = useCallback((source: KnowledgeSource) => {
    setSources((prev) => [source, ...prev])
    setAddOpen(false)
  }, [])

  const handleSourceDeleted = useCallback((sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
  }, [])

  const handleSourceUpdated = useCallback((updated: KnowledgeSource) => {
    setSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  // Close the add-source drawer on Escape.
  useEffect(() => {
    if (!addOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addOpen])

  const readyCount = sources.filter((s) => s.status === 'ready').length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Sources</CardTitle>
                {sources.length > 0 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {sources.length}
                  </span>
                )}
              </div>
              <CardDescription>
                {sources.length === 0
                  ? 'Everything your bot can draw on to answer questions.'
                  : `${readyCount} of ${sources.length} ready to use.`}
              </CardDescription>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4"
                onClick={handleCheckIssues}
                disabled={linting || sources.length === 0}
                title="Scan your content for contradictions, outdated info, and missing topics"
              >
                <SearchCheckIcon className={cn('size-4', linting && 'animate-pulse')} />
                {linting ? 'Checking…' : 'Check for issues'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4"
                onClick={handleRebuildSummaries}
                disabled={summarizing || sources.length === 0}
                title="Synthesize clean answer pages (returns, shipping, contact…) from your content"
              >
                <WandSparklesIcon className={cn('size-4', summarizing && 'animate-pulse')} />
                {summarizing ? 'Building…' : 'Rebuild summaries'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
          {lint && (
            <LintResults
              findings={lint.findings}
              scanned={lint.scanned}
              onClose={() => setLint(null)}
              onResolve={setResolving}
              onDismiss={handleDismiss}
            />
          )}
          <SourceList
            botId={botId}
            sources={sources}
            onDeleted={handleSourceDeleted}
            onUpdated={handleSourceUpdated}
            onAddSource={() => setAddOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/30 transition-opacity duration-300',
          addOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setAddOpen(false)}
        aria-hidden="true"
      />

      {/* Add-source drawer (slides in from the right) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Add a source"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out',
          addOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b p-5">
          <div>
            <h2 className="text-base font-semibold">Add a source</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick a type, then paste text, add a Q&amp;A, link a page, or upload a file.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(false)}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <Tabs defaultValue={defaultTab}>
            {/* HeroUI-style segmented control: muted track, white active pill w/ soft shadow. */}
            <TabsList className="mb-5 w-full rounded-xl bg-muted p-1 group-data-horizontal/tabs:h-11">
              {tabs.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 rounded-lg data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="url">
              <UrlSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="text">
              <TextSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="qa">
              <QaSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="file">
              <FileUpload botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
          </Tabs>
        </div>
      </aside>

      {resolving && (
        <LintResolveDialog
          finding={resolving}
          botId={botId}
          onResolved={removeFinding}
          onSourcesChanged={refreshSources}
          onClose={() => setResolving(null)}
        />
      )}
    </div>
  )
}
