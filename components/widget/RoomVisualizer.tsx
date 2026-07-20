'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { ChatTransport } from '@/lib/widget-transport'
import { readableTextColor, isLightColor } from '@/lib/utils'

/** Selection plumbing passed down to product cards. */
export interface RoomSelect {
  selectedIds: string[]
  /** Selection is at MAX_ROOM_PRODUCTS — unselected cards disable their button. */
  full: boolean
  onToggle: (product: CommerceProduct) => void
  addLabel: string
  addedLabel: string
}

export const MAX_ROOM_PRODUCTS = 6

export interface RoomLabels {
  addToRoom: string
  added: string
  trayCta: string
  trayTryCta: string
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
  historyItem: (n: number) => string
  pickProductHint: string
  changeRoom: string
  orPickPrevious: string
  openFull: string
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
        trayTryCta: 'Išbandyti',
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
        historyItem: (n) => `Vaizdas ${n}`,
        pickProductHint: 'Pasirinkite vieną baldą generavimui',
        changeRoom: 'Keisti kambario nuotrauką',
        orPickPrevious: 'Arba naudokite ankstesnę vizualizaciją:',
        openFull: 'Atidaryti pilno dydžio',
        remaining: (n) => `Liko bandymų: ${n}`,
        limitReached: 'Pasiektas vizualizacijų limitas šiam pokalbiui.',
        genericError: 'Nepavyko sugeneruoti — bandykite dar kartą.',
        resultNote: 'Štai kaip atrodytų jūsų kambaryje 🛋️',
      }
    : {
        addToRoom: '+ Add to room',
        added: '✓ Added',
        trayCta: 'Visualize in your room',
        trayTryCta: 'Try it',
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
        historyItem: (n) => `Render ${n}`,
        pickProductHint: 'Pick one product to generate with',
        changeRoom: 'Change room photo',
        orPickPrevious: 'Or use a previous visualization:',
        openFull: 'Open full size',
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

/**
 * Compact selected-products strip pinned above the composer. Brand-accent
 * card that slides up from under the composer when the first product is added.
 */
export function RoomTray({ products, primaryColor, language, onRemove, onOpen }: RoomTrayProps) {
  const labels = roomLabels(language)
  const textColor = readableTextColor(primaryColor)
  return (
    <AnimatePresence initial={false}>
      {products.length > 0 && (
        <motion.div
          key="room-tray"
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 56, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-3 mb-2 flex items-center gap-2.5 rounded-xl p-2 pl-2.5 shadow-md"
          style={{ backgroundColor: primaryColor, color: textColor }}
        >
          <div className="flex -space-x-2">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onRemove(p.id)}
                aria-label={labels.removeProduct(p.title)}
                title={`${p.title} ✕`}
                className="relative size-9 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-white outline-none focus-visible:ring-2"
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px]">🛋️</span>
                )}
              </button>
            ))}
          </div>
          <span className="min-w-0 flex-1 truncate text-xs font-medium opacity-90">
            {labels.trayCta} ({products.length})
          </span>
          <button
            type="button"
            onClick={onOpen}
            className="shrink-0 rounded-lg bg-white px-3.5 py-2 text-xs font-bold shadow-sm transition-transform hover:scale-[1.03] active:scale-[0.98] outline-none focus-visible:ring-2"
            style={{ color: isLightColor(primaryColor) ? '#111' : primaryColor }}
          >
            {labels.trayTryCta} ✨
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A visitor's room photo plus its pixel size (drives the render aspect ratio). */
export interface RoomPhoto {
  dataUrl: string
  width: number
  height: number
}

/** Client-side downscale so the JSON payload stays small (max 1536px, JPEG). */
export async function downscaleImage(file: File): Promise<RoomPhoto> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height }
}

function measureDataUrl(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = dataUrl
  })
}

/** Data URLs can't be opened as a tab directly — go through a blob URL. */
async function openImageInNewTab(dataUrl: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob()
    window.open(URL.createObjectURL(blob), '_blank', 'noopener')
  } catch {
    // Pop-up blocked or fetch failed — non-critical, do nothing.
  }
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
  /**
   * Past renders from this page session (oldest first). Kept in ChatWindow
   * state so they survive closing the studio; gone on page reload.
   */
  history: string[]
  /** Remove a product from the tray selection (same as tapping it in the tray). */
  onRemoveProduct: (id: string) => void
  /** Room photo lives in ChatWindow state so it survives closing the studio. */
  roomPhoto: RoomPhoto | null
  onRoomPhotoChange: (photo: RoomPhoto | null) => void
}

export function RoomStudio({
  products,
  conversationId,
  visualize,
  primaryColor,
  language,
  onClose,
  onResult,
  history,
  onRemoveProduct,
  roomPhoto,
  onRoomPhotoChange,
}: RoomStudioProps) {
  const labels = roomLabels(language)
  // Reopening the studio shows the latest render from this page session.
  const [result, setResult] = useState<string | null>(history[history.length - 1] ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [instruction, setInstruction] = useState('')
  // Renders use exactly ONE product (nobody wants three sofas in one room).
  const [activeProductId, setActiveProductId] = useState<string | null>(products[0]?.id ?? null)
  const activeProduct = products.find((p) => p.id === activeProductId) ?? products[0]

  const capped = remaining === 0
  const canGenerate = Boolean(roomPhoto && conversationId && activeProduct && !busy && !capped)

  async function generate() {
    if (!roomPhoto || !conversationId || !activeProduct) return
    setBusy(true)
    setError(null)
    const res = await visualize({
      conversationId,
      roomImage: roomPhoto.dataUrl,
      productIds: [activeProduct.id],
      instruction: instruction || undefined,
      roomWidth: roomPhoto.width,
      roomHeight: roomPhoto.height,
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

  /** Use a previous render as the room to edit next. */
  async function usePreviousAsRoom(image: string) {
    try {
      const dims = await measureDataUrl(image)
      onRoomPhotoChange({ dataUrl: image, ...dims })
      setResult(null)
      setError(null)
    } catch {
      setError(labels.genericError)
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
        {/* Product picker — exactly one product goes into each render. */}
        {products.length > 1 && (
          <p className="text-xs text-muted-foreground">{labels.pickProductHint}</p>
        )}
        <div className="flex gap-2 overflow-x-auto">
          {products.map((p) => {
            const active = activeProduct?.id === p.id
            return (
              <div key={p.id} className="relative w-16 shrink-0 text-center">
                <button
                  type="button"
                  onClick={() => setActiveProductId(p.id)}
                  aria-pressed={active}
                  aria-label={p.title}
                  className="size-16 overflow-hidden rounded-lg border-2 bg-muted outline-none focus-visible:ring-2"
                  style={{ borderColor: active ? primaryColor : 'transparent' }}
                >
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveProduct(p.id)}
                  aria-label={labels.removeProduct(p.title)}
                  className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border bg-white text-[10px] leading-none shadow-sm hover:bg-gray-100 outline-none focus-visible:ring-2"
                >
                  ✕
                </button>
                <p className="mt-1 truncate text-[10px] text-muted-foreground" title={p.title}>{p.title}</p>
              </div>
            )
          })}
        </div>

        {/* Result, or the room photo / upload zone */}
        {result ? (
          <img
            src={result}
            alt={labels.resultNote}
            title={labels.openFull}
            onClick={() => void openImageInNewTab(result)}
            className="w-full h-auto cursor-zoom-in rounded-xl border"
          />
        ) : roomPhoto ? (
          <img src={roomPhoto.dataUrl} alt="" className="w-full h-auto rounded-xl border" />
        ) : (
          <>
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
                    onRoomPhotoChange(await downscaleImage(f))
                    setError(null)
                  } catch {
                    // Corrupt/undecodable file — createImageBitmap rejects.
                    setError(labels.genericError)
                  }
                }}
              />
            </label>
            {/* No room photo yet — offer previous renders as the base to edit. */}
            {history.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">{labels.orPickPrevious}</p>
                <div className="flex gap-2 overflow-x-auto">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => void usePreviousAsRoom(h)}
                      aria-label={labels.historyItem(i + 1)}
                      className="size-14 shrink-0 overflow-hidden rounded-lg border-2 border-transparent hover:border-gray-300 outline-none focus-visible:ring-2"
                    >
                      <img src={h} alt={labels.historyItem(i + 1)} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Swap the room photo (upload a new one or reuse a previous render). */}
        {roomPhoto && (
          <button
            type="button"
            onClick={() => {
              onRoomPhotoChange(null)
              setResult(null)
              setError(null)
            }}
            className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground outline-none focus-visible:ring-2"
          >
            {labels.changeRoom}
          </button>
        )}

        {/* Past generations from this page session — tap to view. */}
        {roomPhoto && history.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {history.map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setResult(h)}
                aria-label={labels.historyItem(i + 1)}
                aria-pressed={result === h}
                className="size-14 shrink-0 overflow-hidden rounded-lg border-2 outline-none focus-visible:ring-2"
                style={{ borderColor: result === h ? primaryColor : 'transparent' }}
              >
                <img src={h} alt={labels.historyItem(i + 1)} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Optional placement instruction — available from the first render on. */}
        {roomPhoto && !capped && (
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
