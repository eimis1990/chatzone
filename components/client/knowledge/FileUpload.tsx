'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { UploadIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createBrowserClient } from '@/lib/supabase/browser'
import type { KnowledgeSource } from '@/lib/types'

interface FileUploadProps {
  botId: string
  onSourceAdded: (source: KnowledgeSource) => void
}

const ACCEPTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
}

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md'
const MAX_FILE_SIZE_MB = 20
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function FileUpload({ botId, onSourceAdded }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((f: File): string | null => {
    if (!ACCEPTED_MIME_TYPES[f.type] && !ACCEPTED_MIME_TYPES[f.type.split(';')[0]]) {
      return `Unsupported file type. Accepted: ${Object.values(ACCEPTED_MIME_TYPES).join(', ')}`
    }
    if (f.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB`
    }
    return null
  }, [])

  const handleFileChange = useCallback(
    (f: File | null) => {
      if (!f) {
        setFile(null)
        return
      }
      const error = validateFile(f)
      if (error) {
        toast.error(error)
        setFile(null)
        return
      }
      setFile(f)
    },
    [validateFile],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileChange(e.target.files?.[0] ?? null)
    },
    [handleFileChange],
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragOver(false)
      handleFileChange(e.dataTransfer.files?.[0] ?? null)
    },
    [handleFileChange],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!file) return

      setLoading(true)
      try {
        const supabase = createBrowserClient()

        // Step 1: Insert the source row first to get an id.
        const { data: source, error: insertError } = await supabase
          .from('knowledge_sources')
          .insert({
            bot_id: botId,
            type: 'file',
            name: file.name,
            status: 'pending',
            metadata: {},
          })
          .select('*')
          .single<KnowledgeSource>()

        if (insertError || !source) {
          throw new Error(insertError?.message ?? 'Failed to create source')
        }

        // Step 2: Upload file to Supabase Storage.
        const storagePath = `${botId}/${source.id}/${file.name}`
        const mime = file.type || 'application/octet-stream'

        const { error: uploadError } = await supabase.storage
          .from('knowledge')
          .upload(storagePath, file, { contentType: mime, upsert: false })

        if (uploadError) {
          // Clean up the dangling source row on upload failure.
          await supabase.from('knowledge_sources').delete().eq('id', source.id)
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        // Step 3: Update the source row with the real path and mime.
        const { data: updatedSource, error: updateError } = await supabase
          .from('knowledge_sources')
          .update({ metadata: { path: storagePath, mime } })
          .eq('id', source.id)
          .select('*')
          .single<KnowledgeSource>()

        if (updateError || !updatedSource) {
          throw new Error(updateError?.message ?? 'Failed to update source metadata')
        }

        onSourceAdded(updatedSource)

        // Step 4: Trigger ingestion.
        const ingestRes = await fetch('/api/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: source.id }),
        })
        if (!ingestRes.ok) {
          throw new Error('Ingestion request failed')
        }

        toast.success('File uploaded and ingestion started')
        setFile(null)
        if (inputRef.current) inputRef.current.value = ''
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    },
    [botId, file, onSourceAdded],
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="space-y-1.5">
        <Label>File</Label>
        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Click to select a file or drag and drop"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors text-center',
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50',
          ].join(' ')}
        >
          <UploadIcon className="size-8 text-muted-foreground" />
          {file ? (
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                Drop a file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOCX, TXT, MD — max {MAX_FILE_SIZE_MB} MB
              </p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="sr-only"
          aria-label="File input"
          disabled={loading}
        />
      </div>

      <Button type="submit" disabled={!file || loading}>
        {loading ? 'Uploading…' : 'Upload & ingest'}
      </Button>

      {file && !loading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFile(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
        >
          Clear
        </Button>
      )}
    </form>
  )
}
