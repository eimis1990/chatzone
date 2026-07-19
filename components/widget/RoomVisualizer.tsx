'use client'

import type { CommerceProduct } from '@/lib/commerce/types'
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
