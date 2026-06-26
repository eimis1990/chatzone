'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const trimmedUrl = url.trim()
      if (!isValidUrl(trimmedUrl)) return

      setLoading(true)
      try {
        const supabase = createBrowserClient()

        const { data: source, error: insertError } = await supabase
          .from('knowledge_sources')
          .insert({
            bot_id: botId,
            type: 'url',
            name: trimmedUrl,
            status: 'pending',
            metadata: { url: trimmedUrl },
          })
          .select('*')
          .single<KnowledgeSource>()

        if (insertError || !source) {
          throw new Error(insertError?.message ?? 'Failed to create source')
        }

        onSourceAdded(source)

        const ingestRes = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
        if (!ingestRes.ok) {
          throw new Error('Ingestion request failed')
        }

        toast.success('URL source added and ingestion started')
        trackEvent('knowledge_source_added', { type: 'url' })
        setUrl('')
        setUrlError(null)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [botId, url, onSourceAdded],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="url-input">URL</Label>
        <Input
          id="url-input"
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://example.com/docs"
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
          The page content will be fetched and added to your knowledge base.
        </p>
      </div>

      <Button type="submit" disabled={!canSubmit}>
        {loading ? 'Adding…' : 'Add URL source'}
      </Button>
    </form>
  )
}
