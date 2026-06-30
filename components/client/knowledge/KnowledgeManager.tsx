'use client'

import { useState, useCallback, useEffect } from 'react'
import { FileTextIcon, MessageSquareTextIcon, LinkIcon, UploadIcon, XIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { TextSource } from './TextSource'
import { QaSource } from './QaSource'
import { UrlSource } from './UrlSource'
import { FileUpload } from './FileUpload'
import { SourceList } from './SourceList'
import type { KnowledgeSource } from '@/lib/types'

interface KnowledgeManagerProps {
  botId: string
  initialSources: KnowledgeSource[]
}

const SOURCE_TABS = [
  { value: 'text', label: 'Text', icon: FileTextIcon },
  { value: 'qa', label: 'Q&A', icon: MessageSquareTextIcon },
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'file', label: 'File', icon: UploadIcon },
] as const

export function KnowledgeManager({ botId, initialSources }: KnowledgeManagerProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources)
  const [addOpen, setAddOpen] = useState(false)

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
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
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
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-background shadow-2xl transition-transform duration-300 ease-out',
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
          <Tabs defaultValue="text">
            <TabsList className="mb-5 w-full group-data-horizontal/tabs:h-11">
              {SOURCE_TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 data-active:bg-primary data-active:text-primary-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="text">
              <TextSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="qa">
              <QaSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="url">
              <UrlSource botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
            <TabsContent value="file">
              <FileUpload botId={botId} onSourceAdded={handleSourceAdded} />
            </TabsContent>
          </Tabs>
        </div>
      </aside>
    </div>
  )
}
