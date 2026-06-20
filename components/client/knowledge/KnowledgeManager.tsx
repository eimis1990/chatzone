'use client'

import { useState, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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

export function KnowledgeManager({ botId, initialSources }: KnowledgeManagerProps) {
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources)

  // Called by each add-source component after it creates a row + triggers ingest.
  const handleSourceAdded = useCallback((source: KnowledgeSource) => {
    setSources((prev) => [source, ...prev])
  }, [])

  // Called by SourceList when a source is deleted.
  const handleSourceDeleted = useCallback((sourceId: string) => {
    setSources((prev) => prev.filter((s) => s.id !== sourceId))
  }, [])

  // Called by SourceList when polling discovers status updates.
  const handleSourceUpdated = useCallback((updated: KnowledgeSource) => {
    setSources((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  return (
    <div className="space-y-8">
      {/* ── Add sources ── */}
      <section>
        <h3 className="text-sm font-medium mb-3">Add a source</h3>
        <Tabs defaultValue="text">
          <TabsList className="mb-4">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="qa">Q&amp;A</TabsTrigger>
            <TabsTrigger value="url">URL</TabsTrigger>
            <TabsTrigger value="file">File</TabsTrigger>
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
      </section>

      {/* ── Source list ── */}
      <section>
        <h3 className="text-sm font-medium mb-3">
          Sources
          {sources.length > 0 && (
            <span className="ml-2 text-muted-foreground font-normal">
              ({sources.length})
            </span>
          )}
        </h3>
        <SourceList
          botId={botId}
          sources={sources}
          onDeleted={handleSourceDeleted}
          onUpdated={handleSourceUpdated}
        />
      </section>
    </div>
  )
}
