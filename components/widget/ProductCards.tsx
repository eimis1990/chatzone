'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { CommerceProduct } from '@/lib/commerce/types'

interface ProductCardsProps {
  products: CommerceProduct[]
  bubbleRadius?: number
  primaryColor?: string
  language?: 'en' | 'lt'
  /** Open the full-height list overlay for this message's products. */
  onSeeAll?: (products: CommerceProduct[]) => void
}

/** How many products are shown as cards before the rest move behind "See all". */
const CARD_LIMIT = 4

interface Labels {
  viewMore: string
  details: string
  seeAll: string
  back: string
  results: string
  outOfStock: string
  products: string
}

export function labelsFor(language: 'en' | 'lt'): Labels {
  return language === 'lt'
    ? {
        viewMore: 'Plačiau',
        details: 'Aprašymas',
        seeAll: 'Žiūrėti visus',
        back: 'Atgal',
        results: 'Visi rezultatai',
        outOfStock: 'Nėra sandėlyje',
        products: 'Produktai',
      }
    : {
        viewMore: 'View more',
        details: 'Details',
        seeAll: 'See all',
        back: 'Back',
        results: 'All results',
        outOfStock: 'Out of stock',
        products: 'Products',
      }
}

export function ProductCards({
  products,
  bubbleRadius = 16,
  primaryColor = '#4f46e5',
  language = 'en',
  onSeeAll,
}: ProductCardsProps) {
  if (!products || products.length === 0) return null
  const labels = labelsFor(language)
  const hasMore = products.length > CARD_LIMIT

  return (
    <div className="w-full mt-2" aria-label={labels.products}>
      <div
        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
        role="list"
      >
        {products.slice(0, CARD_LIMIT).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            bubbleRadius={bubbleRadius}
            primaryColor={primaryColor}
            viewMoreLabel={labels.viewMore}
            outOfStockLabel={labels.outOfStock}
          />
        ))}
        {hasMore && (
          <SeeAllCard
            bubbleRadius={bubbleRadius}
            primaryColor={primaryColor}
            label={labels.seeAll}
            count={products.length}
            onClick={() => onSeeAll?.(products)}
          />
        )}
      </div>
    </div>
  )
}

interface ProductListViewProps {
  products: CommerceProduct[]
  bubbleRadius?: number
  primaryColor?: string
  language?: 'en' | 'lt'
  onClose: () => void
}

/**
 * Full-height product list that takes over the chat body (below the header,
 * over the messages and composer). Rendered by the chat container, not inline
 * in a message. Each row can expand to reveal a short description and links out.
 */
export function ProductListView({
  products,
  bubbleRadius = 16,
  primaryColor = '#4f46e5',
  language = 'en',
  onClose,
}: ProductListViewProps) {
  const labels = labelsFor(language)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="absolute inset-0 z-20 flex flex-col bg-background"
      role="region"
      aria-label={labels.products}
    >
      {/* Sticky sub-header with back + count */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -ml-1"
        >
          <BackIcon />
          {labels.back}
        </button>
        <span className="text-xs text-muted-foreground">
          {labels.results} ({products.length})
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex flex-col gap-1.5" role="list">
          {products.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              bubbleRadius={bubbleRadius}
              primaryColor={primaryColor}
              labels={labels}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

interface ProductCardProps {
  product: CommerceProduct
  bubbleRadius: number
  primaryColor: string
  viewMoreLabel: string
  outOfStockLabel: string
}

function ProductCard({
  product,
  bubbleRadius,
  primaryColor,
  viewMoreLabel,
  outOfStockLabel,
}: ProductCardProps) {
  // Card takes ~55% of the container so ~2 cards peek; minimum width 180px.
  const cardRadius = bubbleRadius
  const imageRadius = `${cardRadius}px ${cardRadius}px 0 0`
  const cardStyle = {
    borderRadius: `${cardRadius}px`,
    minWidth: '180px',
    width: '55%',
    flexShrink: 0,
  }

  return (
    <div
      className="flex flex-col border bg-background shadow-sm snap-start overflow-hidden"
      style={cardStyle}
      role="listitem"
    >
      {/* Image area */}
      <div
        className="relative w-full overflow-hidden bg-muted"
        style={{ aspectRatio: '1 / 1', borderRadius: imageRadius }}
      >
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            aria-hidden="true"
          >
            <PlaceholderIcon />
          </div>
        )}

        {/* Out of stock badge */}
        {!product.inStock && (
          <span
            className="absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-background/80 text-muted-foreground border"
          >
            {outOfStockLabel}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-2 flex-1">
        {/* Title — 2-line clamp */}
        <p
          className="text-xs font-medium leading-tight text-foreground"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
          title={product.title}
        >
          {product.title}
        </p>

        {/* Price */}
        <p className="text-sm font-bold text-foreground tabular-nums">
          {product.price}
        </p>

        {/* View more button */}
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto flex items-center justify-center rounded text-white text-xs font-medium py-1.5 px-2 transition-opacity hover:opacity-85 active:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-1 outline-none"
          style={{
            backgroundColor: primaryColor,
            borderRadius: `${Math.min(cardRadius, 8)}px`,
          }}
        >
          {viewMoreLabel}
        </a>
      </div>
    </div>
  )
}

interface SeeAllCardProps {
  bubbleRadius: number
  primaryColor: string
  label: string
  count: number
  onClick: () => void
}

function SeeAllCard({ bubbleRadius, primaryColor, label, count, onClick }: SeeAllCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 border border-dashed bg-muted/30 snap-start shrink-0 transition-colors hover:bg-muted/60 focus-visible:ring-2 outline-none"
      style={{
        borderRadius: `${bubbleRadius}px`,
        minWidth: '120px',
        width: '38%',
      }}
      aria-label={`${label} (${count})`}
    >
      <span
        className="flex items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: primaryColor, color: '#fff' }}
      >
        <GridIcon />
      </span>
      <span className="text-xs font-medium text-foreground text-center px-2">
        {label}
        <span className="block text-[11px] font-normal text-muted-foreground">{count}</span>
      </span>
    </button>
  )
}

interface ProductRowProps {
  product: CommerceProduct
  bubbleRadius: number
  primaryColor: string
  labels: Labels
}

function ProductRow({ product, bubbleRadius, primaryColor, labels }: ProductRowProps) {
  const [expanded, setExpanded] = useState(false)
  const rowRadius = Math.min(bubbleRadius, 14)
  const hasDescription = Boolean(product.shortDescription)

  return (
    <div
      className="border bg-background overflow-hidden"
      style={{ borderRadius: `${rowRadius}px` }}
      role="listitem"
    >
      <div className="flex items-stretch gap-2 p-2">
        {/* Thumbnail */}
        <div
          className="relative shrink-0 overflow-hidden bg-muted"
          style={{ width: 56, height: 56, borderRadius: `${Math.min(rowRadius, 10)}px` }}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" aria-hidden="true">
              <PlaceholderIcon />
            </div>
          )}
        </div>

        {/* Title + price */}
        <div className="flex flex-col min-w-0 flex-1 justify-center">
          <p
            className="text-xs font-medium leading-tight text-foreground"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
            title={product.title}
          >
            {product.title}
          </p>
          <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{product.price}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 justify-center shrink-0">
          {hasDescription && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="flex items-center justify-center gap-0.5 rounded border text-[11px] font-medium py-1 px-2 text-foreground transition-colors hover:bg-muted outline-none focus-visible:ring-2"
              style={{ borderRadius: `${Math.min(rowRadius, 8)}px` }}
            >
              {labels.details}
              <Chevron open={expanded} />
            </button>
          )}
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center rounded text-white text-[11px] font-medium py-1 px-2 transition-opacity hover:opacity-85 active:opacity-70 outline-none focus-visible:ring-2"
            style={{ backgroundColor: primaryColor, borderRadius: `${Math.min(rowRadius, 8)}px` }}
          >
            {labels.viewMore}
          </a>
        </div>
      </div>

      {/* Expandable description */}
      <AnimatePresence initial={false}>
        {expanded && hasDescription && (
          <motion.div
            key="desc"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ overflow: 'hidden' }}
          >
            <p className="text-xs leading-relaxed text-muted-foreground px-2 pb-2 pt-0">
              {product.shortDescription}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PlaceholderIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground/40"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
