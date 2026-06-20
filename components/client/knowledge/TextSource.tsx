'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'

interface TextSourceProps {
  botId: string
  onSourceAdded: (source: KnowledgeSource) => void
}

export function TextSource({ botId, onSourceAdded }: TextSourceProps) {
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()

      const trimmedName = name.trim()
      const trimmedContent = content.trim()
      if (!trimmedName || !trimmedContent) return

      setLoading(true)
      try {
        const supabase = createBrowserClient()

        // Insert the knowledge_sources row.
        const { data: source, error: insertError } = await supabase
          .from('knowledge_sources')
          .insert({
            bot_id: botId,
            type: 'text',
            name: trimmedName,
            status: 'pending',
            metadata: { content: trimmedContent },
          })
          .select('*')
          .single<KnowledgeSource>()

        if (insertError || !source) {
          throw new Error(insertError?.message ?? 'Failed to create source')
        }

        onSourceAdded(source)

        // Trigger ingestion.
        const ingestRes = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
        if (!ingestRes.ok) {
          throw new Error('Ingestion request failed')
        }

        toast.success('Text source added and ingestion started')
        setName('')
        setContent('')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [botId, name, content, onSourceAdded],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label htmlFor="text-name">Source name</Label>
        <Input
          id="text-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Company FAQ"
          required
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="text-content">Content</Label>
        <Textarea
          id="text-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste or type the text you want to add to the knowledge base…"
          className="min-h-40 font-mono text-sm"
          required
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={loading || !name.trim() || !content.trim()}>
        {loading ? 'Adding…' : 'Add text source'}
      </Button>
    </form>
  )
}
