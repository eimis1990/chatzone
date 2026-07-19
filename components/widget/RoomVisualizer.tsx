'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { ChatTransport } from '@/lib/widget-transport'
import { readableTextColor } from '@/lib/utils'

/** Selection plumbing passed down to product cards. */
export interface RoomSelect {
  selectedIds: string[]
  /** Selection is at MAX_ROOM_PRODUCTS — unselected cards disable their button. */
  full: boolean
  onToggle: (product: CommerceProduct) => void
  addLabel: string
  addedLabel: string
}

export const MAX_ROOM_PRODUCTS = 4

export interface RoomLabels {
  addToRoom: string
  added: string
  trayCta: string
  trayTitle: string
  uploadTitle: string
  uploadHint: string
  generate: string
  generating: string
  regenerate: string
  instructionPlaceholder: string
  download: string
  back: string
  removeProduct: (title: string) => string
  remaining: (n: number) => string
  limitReached: string
  genericError: string
  resultNote: string
}

export function roomLabels(language: 'en' | 'lt'): RoomLabels {
  return language === 'lt'
    ? {
        addToRoom: '+ Į kambarį',
        added: '✓ Pridėta',
        trayCta: 'Vizualizuoti mano kambaryje',
        trayTitle: 'Jūsų kambarys',
        uploadTitle: 'Įkelkite savo kambario nuotrauką',
        uploadHint: 'JPG, PNG arba WebP — geriausiai tinka šviesi, aiški nuotrauka.',
        generate: 'Generuoti',
        generating: 'Generuojama…',
        regenerate: 'Generuoti iš naujo',
        instructionPlaceholder: 'Pvz.: „pastatykite prie lango“ (nebūtina)',
        download: 'Atsisiųsti',
        back: 'Atgal',
        removeProduct: (title) => `Pašalinti ${title}`,
        remaining: (n) => `Liko bandymų: ${n}`,
        limitReached: 'Pasiektas vizualizacijų limitas šiam pokalbiui.',
        genericError: 'Nepavyko sugeneruoti — bandykite dar kartą.',
        resultNote: 'Štai kaip atrodytų jūsų kambaryje 🛋️',
      }
    : {
        addToRoom: '+ Add to room',
        added: '✓ Added',
        trayCta: 'Visualize in your room',
        trayTitle: 'Your room',
        uploadTitle: 'Upload a photo of your room',
        uploadHint: 'JPG, PNG or WebP — a bright, straight-on photo works best.',
        generate: 'Generate',
        generating: 'Generating…',
        regenerate: 'Regenerate',
        instructionPlaceholder: 'e.g. "place it by the window" (optional)',
        download: 'Download',
        back: 'Back',
        removeProduct: (title) => `Remove ${title}`,
        remaining: (n) => `${n} renders left`,
        limitReached: 'Visualization limit reached for this conversation.',
        genericError: 'Generation failed — please try again.',
        resultNote: 'Here is how it could look in your room 🛋️',
      }
}

interface RoomTrayProps {
  products: CommerceProduct[]
  primaryColor: string
  language: 'en' | 'lt'
  onRemove: (id: string) => void
  onOpen: () => void
}

/** Compact selected-products strip pinned above the composer. */
export function RoomTray({ products, primaryColor, language, onRemove, onOpen }: RoomTrayProps) {
  if (products.length === 0) return null
  const labels = roomLabels(language)
  return (
    <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm">
      <div className="flex -space-x-2">
        {products.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onRemove(p.id)}
            aria-label={labels.removeProduct(p.title)}
            title={`${p.title} ✕`}
            className="relative size-9 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-muted outline-none focus-visible:ring-2"
          >
            {p.imageUrl ? (
              <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
            ) : (
              <span className="text-[10px]">🛋️</span>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="ml-auto rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-85 outline-none focus-visible:ring-2"
        style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
      >
        {labels.trayCta} ({products.length})
      </button>
    </div>
  )
}

/** Client-side downscale so the JSON payload stays small (max 1536px, JPEG). */
export async function downscaleImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}

interface RoomStudioProps {
  products: CommerceProduct[]
  conversationId?: string
  visualize: NonNullable<ChatTransport['visualize']>
  primaryColor: string
  language: 'en' | 'lt'
  onClose: () => void
  /** Push the finished render into the chat transcript. */
  onResult: (image: string) => void
}

export function RoomStudio({
  products,
  conversationId,
  visualize,
  primaryColor,
  language,
  onClose,
  onResult,
}: RoomStudioProps) {
  const labels = roomLabels(language)
  const [roomImage, setRoomImage] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [instruction, setInstruction] = useState('')

  const capped = remaining === 0
  const canGenerate = Boolean(roomImage && conversationId && products.length > 0 && !busy && !capped)

  async function generate() {
    if (!roomImage || !conversationId) return
    setBusy(true)
    setError(null)
    const res = await visualize({
      conversationId,
      roomImage,
      productIds: products.map((p) => p.id),
      instruction: instruction || undefined,
    }).catch((): { image?: string; remaining?: number; error?: string } => ({ error: labels.genericError }))
    setBusy(false)
    if ('error' in res && res.error) {
      if ('remaining' in res && res.remaining === 0) setRemaining(0)
      setError(res.remaining === 0 ? labels.limitReached : res.error)
      return
    }
    if (res.image) {
      setResult(res.image)
      setRemaining(res.remaining ?? null)
      onResult(res.image)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute inset-0 z-30 flex flex-col bg-white"
      role="dialog"
      aria-label={labels.trayTitle}
    >
      {/* Header — mirrors ProductListView's sub-header. */}
      <div
        className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.back}
          className="text-sm font-medium -ml-1 hover:opacity-80 outline-none focus-visible:ring-2"
        >
          ← {labels.back}
        </button>
        <span className="text-xs opacity-80">
          {remaining !== null ? labels.remaining(remaining) : labels.trayTitle}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Selected products strip */}
        <div className="flex gap-2 overflow-x-auto">
          {products.map((p) => (
            <div key={p.id} className="w-16 shrink-0 text-center">
              <div className="size-16 overflow-hidden rounded-lg border bg-muted">
                {p.imageUrl && <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />}
              </div>
              <p className="mt-1 truncate text-[10px] text-muted-foreground" title={p.title}>{p.title}</p>
            </div>
          ))}
        </div>

        {/* Result, or the room photo / upload zone */}
        {result ? (
          <img src={result} alt={labels.resultNote} className="w-full rounded-xl border" />
        ) : roomImage ? (
          <img src={roomImage} alt="" className="w-full rounded-xl border" />
        ) : (
          <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed p-6 text-center hover:bg-gray-50">
            <span className="text-sm font-medium">{labels.uploadTitle}</span>
            <span className="text-xs text-muted-foreground">{labels.uploadHint}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  setRoomImage(await downscaleImage(f))
                  setError(null)
                } catch {
                  // Corrupt/undecodable file — createImageBitmap rejects.
                  setError(labels.genericError)
                }
              }}
            />
          </label>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Regenerate instruction (after a first render) */}
        {result && !capped && (
          <input
            type="text"
            value={instruction}
            maxLength={200}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={labels.instructionPlaceholder}
            aria-label={labels.instructionPlaceholder}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-2"
          />
        )}
      </div>

      {/* Footer actions */}
      <div className="flex gap-2 border-t p-3">
        {result && (
          <a
            href={result}
            download="room-visualization.jpg"
            className="flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {labels.download}
          </a>
        )}
        <button
          type="button"
          disabled={!canGenerate}
          onClick={generate}
          className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-85 disabled:opacity-40 outline-none focus-visible:ring-2"
          style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
        >
          {busy ? labels.generating : result ? labels.regenerate : labels.generate}
        </button>
      </div>
    </motion.div>
  )
}
