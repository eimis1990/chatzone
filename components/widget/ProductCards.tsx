'use client'

import type { CommerceProduct } from '@/lib/commerce/types'

interface ProductCardsProps {
  products: CommerceProduct[]
  bubbleRadius?: number
  primaryColor?: string
  language?: 'en' | 'lt'
}

export function ProductCards({
  products,
  bubbleRadius = 16,
  primaryColor = '#4f46e5',
  language = 'en',
}: ProductCardsProps) {
  if (!products || products.length === 0) return null

  const viewMoreLabel = language === 'lt' ? 'Plačiau' : 'View more'
  const outOfStockLabel = language === 'lt' ? 'Nėra sandėlyje' : 'Out of stock'

  return (
    <div
      className="w-full mt-2"
      aria-label={language === 'lt' ? 'Produktai' : 'Products'}
    >
      <div
        className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'thin' }}
        role="list"
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            bubbleRadius={bubbleRadius}
            primaryColor={primaryColor}
            viewMoreLabel={viewMoreLabel}
            outOfStockLabel={outOfStockLabel}
          />
        ))}
      </div>
    </div>
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
  // Card takes ~46% of the container so 2 cards are visible; minimum width 150px.
  const cardRadius = bubbleRadius
  const imageRadius = `${cardRadius}px ${cardRadius}px 0 0`
  const cardStyle = {
    borderRadius: `${cardRadius}px`,
    minWidth: '150px',
    width: '46%',
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
