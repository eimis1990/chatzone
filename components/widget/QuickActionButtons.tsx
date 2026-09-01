'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowDownIcon, ChevronRightIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { sqLabel } from '@/lib/widget-config'
import type { SuggestedQuestion } from '@/lib/types'

export type QuickActionsVariant = 'default' | 'pills' | 'list'

interface QuickActionButtonsProps {
  questions: SuggestedQuestion[]
  variant?: QuickActionsVariant
  primaryColor: string
  /** Arrow/chevron tint — the header color kept visible on white. */
  accentColor?: string
  /** Corner radius (already capped by the caller), e.g. "14px". */
  radius?: string
  glassBubbles?: boolean
  glassClasses?: string
  /** Bot-bubble surface override (background+color), when the bot sets one. */
  surfaceStyle?: CSSProperties
  hasSurface?: boolean
  bubbleBorder?: CSSProperties
  darkBg?: boolean
  /** Receives the clicked action and its index (so the host can fetch / send). */
  onSelect: (action: SuggestedQuestion, index: number) => void
}

/**
 * The welcome screen's suggested-action buttons — a component-library entry
 * ('quick-actions') with three looks: 'default' 2-col tiles with a corner glow,
 * 'pills' centered wrap of chips, 'list' stacked menu rows. Self-contained
 * motion so it also renders standalone in library previews.
 */
export function QuickActionButtons({
  questions,
  variant = 'default',
  primaryColor,
  accentColor = primaryColor,
  radius = '16px',
  glassBubbles = false,
  glassClasses = '',
  surfaceStyle = {},
  hasSurface = false,
  bubbleBorder = {},
  darkBg = false,
  onSelect,
}: QuickActionButtonsProps) {
  const reduce = useReducedMotion()
  const container: Variants = {
    hidden: {},
    show: { transition: reduce ? {} : { staggerChildren: 0.07, delayChildren: 0.05 } },
  }
  const item: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  }

  const visible = questions.slice(0, 6)
  if (visible.length === 0) return null

  // Shared surface treatment: glass > bot-bubble surface > plain white/border.
  const surfaceClasses = glassBubbles
    ? glassClasses
    : hasSurface
      ? ''
      : 'border border-gray-200 bg-white'
  const textClasses = glassBubbles && darkBg ? 'text-gray-50' : hasSurface ? '' : 'text-gray-800'

  if (variant === 'pills') {
    return (
      <motion.div
        className="mt-auto flex flex-wrap justify-center gap-2 pt-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {visible.map((q, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => onSelect(q, i)}
            variants={item}
            className={`rounded-full px-3.5 py-2 text-sm font-medium leading-snug transition-colors hover:border-current ${surfaceClasses} ${textClasses}`}
            style={{ ...bubbleBorder, ...surfaceStyle }}
          >
            {sqLabel(q)}
          </motion.button>
        ))}
      </motion.div>
    )
  }

  if (variant === 'list') {
    return (
      <motion.div
        className="mt-auto flex flex-col gap-2 pt-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {visible.map((q, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => onSelect(q, i)}
            variants={item}
            className={`group flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-medium leading-snug ${surfaceClasses} ${textClasses}`}
            style={{ borderRadius: radius, ...bubbleBorder, ...surfaceStyle }}
          >
            <span>{sqLabel(q)}</span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              style={{ color: accentColor }}
            />
          </motion.button>
        ))}
      </motion.div>
    )
  }

  // Default — 2-col tiles with a tinted corner glow; an odd trailing tile
  // spans the full width so the grid never looks lopsided.
  const orphanLast = visible.length % 2 === 1
  return (
    <motion.div
      className="mt-auto grid grid-cols-2 gap-2 pt-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {visible.map((q, i) => {
        const fullWidth = orphanLast && i === visible.length - 1
        return (
          <motion.button
            key={i}
            type="button"
            onClick={() => onSelect(q, i)}
            variants={item}
            // The mask is for iOS Safari: WebKit doesn't clip a blurred child
            // (the glow below) to a rounded overflow-hidden parent, so the glow
            // painted square corners. Masking the tile to its own box fixes it.
            className={`group relative flex min-h-[64px] flex-col justify-end overflow-hidden p-3 text-left text-sm font-medium leading-snug [-webkit-mask-image:-webkit-radial-gradient(white,black)] ${surfaceClasses} ${textClasses}${fullWidth ? ' col-span-2' : ''}`}
            style={{ borderRadius: radius, ...bubbleBorder, ...surfaceStyle }}
          >
            {/* Soft glow in the top-right corner, tinted to the header color.
                Intensifies on hover instead of a background change. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full opacity-30 blur-2xl transition-opacity duration-300 group-hover:opacity-65"
              style={{ backgroundColor: primaryColor }}
            />
            {/* Arrow sits in the glow; nudges down on hover to signal it's pressable */}
            <ArrowDownIcon
              aria-hidden="true"
              className="absolute right-3 top-3 size-4 transition-transform duration-200 ease-out group-hover:translate-y-1"
              style={{ color: accentColor }}
            />
            <span className="relative">{sqLabel(q)}</span>
          </motion.button>
        )
      })}
    </motion.div>
  )
}
