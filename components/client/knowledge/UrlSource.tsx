'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'
import { trackEvent } from '@/lib/analytics'

interface UrlSourceProps {
  botId: string
  onSourceAdded: (source: KnowledgeSource) => void
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function UrlSource({ botId, onSourceAdded }: UrlSourceProps) {
  const [url, setUrl] = useState('')
  const [crawl, setCrawl] = useState(false)
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setUrl(value)
    if (value && !isValidUrl(value)) {
      setUrlError('Please enter a valid http or https URL')
    } else {
      setUrlError(null)
    }
  }, [])

  const canSubmit = url.trim() !== '' && isValidUrl(url) && !loading

  // Crawl the whole site: discover pages (sitemap → links) and ingest a batch.
  const handleCrawl = useCallback(
    async (trimmedUrl: string) => {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId, url: trimmedUrl }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        sources?: KnowledgeSource[]
        added?: number
        remaining?: number
        error?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Crawl failed')

      const sources = data.sources ?? []
      sources.forEach(onSourceAdded)
      trackEvent('knowledge_source_added', { type: 'url' })

      const n = sources.length
      const remaining = data.remaining ?? 0
      toast.success(
        `Added ${n} page${n === 1 ? '' : 's'} from your site` +
          (remaining > 0 ? ` — ${remaining} more found, crawl again to add them.` : '.'),
      )
    },
    [botId, onSourceAdded],
  )

  // Single page: create a source row then trigger ingestion.
  const handleSingle = useCallback(
    async (trimmedUrl: string) => {
      const supabase = createBrowserClient()
      const { data: source, error: insertError } = await supabase
        .from('knowledge_sources')
        .insert({ bot_id: botId, type: 'url', name: trimmedUrl, status: 'pending', metadata: { url: trimmedUrl } })
        .select('*')
        .single<KnowledgeSource>()
      if (insertError || !source) throw new Error(insertError?.message ?? 'Failed to create source')

      onSourceAdded(source)
      const ingestRes = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: source.id }),
      })
      if (!ingestRes.ok) throw new Error('Ingestion request failed')
      toast.success('URL source added and ingestion started')
      trackEvent('knowledge_source_added', { type: 'url' })
    },
    [botId, onSourceAdded],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmedUrl = url.trim()
      if (!isValidUrl(trimmedUrl)) return

      setLoading(true)
      try {
        if (crawl) await handleCrawl(trimmedUrl)
        else await handleSingle(trimmedUrl)
        setUrl('')
        setUrlError(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [url, crawl, handleCrawl, handleSingle],
  )

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="url-input">{crawl ? 'Website URL' : 'URL'}</Label>
        <Input
          id="url-input"
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com"
          required
          disabled={loading}
          aria-describedby={urlError ? 'url-error' : undefined}
          aria-invalid={urlError ? true : undefined}
        />
        {urlError && (
          <p id="url-error" className="text-xs text-destructive">
            {urlError}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          {crawl
            ? "We'll find your site's pages (via its sitemap or links) and train on a batch — re-crawl to add more."
            : 'The page content will be fetched and added to your knowledge base.'}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="crawl-toggle">Crawl entire site</Label>
          <p className="text-xs text-muted-foreground">Train on multiple pages instead of just this one.</p>
        </div>
        <Switch id="crawl-toggle" checked={crawl} onCheckedChange={setCrawl} disabled={loading} />
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {loading
          ? crawl
            ? 'Crawling & training…'
            : 'Adding…'
          : crawl
            ? 'Crawl & train'
            : 'Add URL source'}
      </Button>
      {loading && crawl && (
        <p className="text-xs text-muted-foreground">This can take up to a minute — hang tight.</p>
      )}
    </form>
  )
}
