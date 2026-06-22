'use client'

import { useRef, useState } from 'react'
import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form'
import { toast } from 'sonner'
import { ImageIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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

  const avatarUrl = useWatch({ control, name })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!inputRef.current) return
    inputRef.current.value = ''
    if (!file) return

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

      const { data } = supabase.storage
        .from('public-assets')
        .getPublicUrl(path)

      setValue(name, data.publicUrl, { shouldDirty: true })
      toast.success(`${label} uploaded. Save to apply.`)
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setValue(name, '', { shouldDirty: true })
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="w-14 h-14 rounded-xl border border-border flex items-center justify-center bg-muted flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Bot logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon className="size-3.5 mr-1" aria-hidden="true" />
              {uploading ? 'Uploading…' : avatarUrl ? 'Replace' : 'Upload'}
            </Button>
            {avatarUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                aria-label="Remove logo"
              >
                <Trash2Icon className="size-3.5 mr-1" aria-hidden="true" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {description ?? `PNG, JPG, SVG, WebP — max ${MAX_SIZE_MB} MB`}
          </p>
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
