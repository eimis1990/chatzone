'use client'

import { useRef, useState } from 'react'
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form'
import { toast } from 'sonner'
import { Trash2Icon, UploadIcon, LoaderCircleIcon } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'

type FormValues = z.input<typeof botConfigFormSchema>

interface LogoUploadProps {
  botId: string
  control: Control<FormValues>
  setValue: UseFormSetValue<FormValues>
  /** Which config field this uploader writes to. Defaults to the company logo. */
  name?: 'avatarUrl' | 'botAvatarUrl'
  label?: string
  description?: string
  /** Storage filename prefix (keeps the two images distinct in the bucket). */
  filePrefix?: string
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_SIZE_MB = 2

export function LogoUpload({
  botId,
  control,
  setValue,
  name = 'avatarUrl',
  label = 'Logo',
  description,
  filePrefix = 'logo',
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const avatarUrl = useWatch({ control, name })

  const uploadFile = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Use PNG, JPG, SVG or WebP.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`)
      return
    }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${botId}/${filePrefix}-${Date.now()}.${ext}`
      const supabase = createBrowserClient()

      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(path, file, { upsert: true })

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`)
        return
      }

      const { data } = supabase.storage.from('public-assets').getPublicUrl(path)
      setValue(name, data.publicUrl, { shouldDirty: true })
      toast.success(`${label} uploaded. Save to apply.`)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (file) void uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  const handleRemove = () => setValue(name, '', { shouldDirty: true })

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3.5">
        {/* Clickable / drag-and-drop preview card */}
        <div
          role="button"
          tabIndex={0}
          aria-label={avatarUrl ? `Replace ${label}` : `Upload ${label}`}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'group relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            dragging && 'border-primary bg-primary/10',
            avatarUrl && 'border-solid',
          )}
        >
          {uploading ? (
            <LoaderCircleIcon className="size-5 animate-spin" aria-hidden="true" />
          ) : avatarUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatarUrl} alt="" className="size-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <UploadIcon className="size-5 text-white" aria-hidden="true" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <UploadIcon className="size-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">Upload</span>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-xs text-muted-foreground">
            {description ?? `Shown to visitors.`}
          </p>
          <p className="text-xs text-muted-foreground/70">
            Click or drop an image · PNG, JPG, SVG, WebP · max {MAX_SIZE_MB} MB
          </p>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:underline"
            >
              <Trash2Icon className="size-3.5" aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        aria-label="Upload logo"
        onChange={handleFileChange}
      />
    </div>
  )
}
