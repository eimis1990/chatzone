'use client'

import { useState, useCallback } from 'react'
import { FileTextIcon, MessageSquareTextIcon, LinkIcon, UploadIcon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
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

const SOURCE_TABS = [
  { value: 'text', label: 'Text', icon: FileTextIcon },
  { value: 'qa', label: 'Q&A', icon: MessageSquareTextIcon },
  { value: 'url', label: 'URL', icon: LinkIcon },
  { value: 'file', label: 'File', icon: UploadIcon },
] as const

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

  const readyCount = sources.filter((s) => s.status === 'ready').length

  return (
    <div className="max-w-4xl space-y-6">
      {/* ── Add sources ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Add a source</CardTitle>
          <CardDescription>
            Pick a type, then paste text, add a Q&amp;A, link a page, or upload a file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="text">
            <TabsList className="mb-5">
              {SOURCE_TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  <Icon className="size-3.5" aria-hidden="true" />
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
        </CardContent>
      </Card>

      {/* ── Source list ── */}
      <Card>
        <CardHeader className="border-b">
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
        <CardContent className="p-0">
          <SourceList
            botId={botId}
            sources={sources}
            onDeleted={handleSourceDeleted}
            onUpdated={handleSourceUpdated}
          />
        </CardContent>
      </Card>
    </div>
  )
}
