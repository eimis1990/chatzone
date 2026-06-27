'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { ArrowDownIcon } from 'lucide-react'
import { readableTextColor, isLightColor } from '@/lib/utils'
import { sqLabel } from '@/lib/widget-config'
import type { SuggestedQuestion } from '@/lib/types'

interface WelcomeScreenProps {
  displayName: string
  tagline?: string
  avatarUrl?: string
  greeting: string
  suggestedQuestions: SuggestedQuestion[]
  primaryColor: string
  /** Chat background color — drives readable text color for the non-bubble header. */
  backgroundColor?: string
  bubbleRadius?: number
  /** Frosted-glass greeting bubble (translucent + backdrop blur). */
  glassBubbles?: boolean
  /** Optional border on the greeting bubble + action tiles (width 0 = none). */
  bubbleBorderColor?: string
  bubbleBorderWidth?: number
  /** Receives the clicked action and its index (so the host can fetch / send). */
  onSelect: (action: SuggestedQuestion, index: number) => void
}

/**
 * The widget's empty state — centered avatar, name, tagline, a welcome message,
 * and suggested-action buttons. Replaces the old always-on greeting bubble and
 * shows only before the conversation starts.
 *
 * Elements fade/slide in with a subtle stagger. Because this component mounts
 * whenever there are no messages, the entrance also replays after a restart.
 */
export function WelcomeScreen({
  displayName,
  tagline,
  avatarUrl,
  greeting,
  suggestedQuestions,
  primaryColor,
  backgroundColor = '#ffffff',
  bubbleRadius = 16,
  glassBubbles = false,
  bubbleBorderColor = '#e5e7eb',
  bubbleBorderWidth = 0,
  onSelect,
}: WelcomeScreenProps) {
  const radius = `${Math.min(bubbleRadius, 16)}px`
  const bubbleBorder =
    bubbleBorderWidth > 0 ? { border: `${bubbleBorderWidth}px solid ${bubbleBorderColor}` } : {}
  // Tint the arrow with the header color, but keep it visible on white when
  // that color is very light.
  const accentColor = isLightColor(primaryColor) ? '#9ca3af' : primaryColor
  // On a dark chat background the name + tagline (which sit directly on the
  // background, not in a bubble) would be dark-on-dark — flip them to light.
  const darkBg = !isLightColor(backgroundColor)
  const visibleQuestions = suggestedQuestions.slice(0, 6)
  // With an odd number of tiles the last one would sit alone in a half-width
  // cell — span it full width instead so the grid never looks lopsided.
  const orphanLast = visibleQuestions.length % 2 === 1

  const reduce = useReducedMotion()

  // Subtle staggered entrance. With reduced motion we drop the slide + stagger
  // and just render everything in place.
  const container: Variants = {
    hidden: {},
    show: {
      transition: reduce ? {} : { staggerChildren: 0.07, delayChildren: 0.05 },
    },
  }
  const item: Variants = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-y-auto px-4 py-6"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Avatar + name + tagline */}
      <motion.div className="flex flex-col items-center text-center" variants={item}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-20 rounded-full object-cover ring-1 ring-black/5"
          />
        ) : (
          <div
            className="flex size-20 items-center justify-center rounded-full text-2xl font-bold text-white"
            style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
            aria-hidden="true"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <h2
          className="mt-3 text-lg font-bold leading-tight text-gray-900"
          style={darkBg ? { color: '#ffffff' } : undefined}
        >
          {displayName}
        </h2>
        {tagline ? (
          <p
            className="text-sm text-gray-500"
            style={darkBg ? { color: 'rgba(255,255,255,0.75)' } : undefined}
          >
            {tagline}
          </p>
        ) : null}
      </motion.div>

      {/* Welcome message card */}
      {greeting ? (
        <motion.div
          className={`mt-5 px-4 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap ${
            glassBubbles ? 'bg-white/40 backdrop-blur-md ring-1 ring-white/50' : 'bg-gray-100'
          }`}
          style={{ borderRadius: radius, ...bubbleBorder }}
          variants={item}
        >
          {greeting}
        </motion.div>
      ) : null}

      {/* Suggested-action tiles — 2 per row, bottom-aligned above the composer.
          An odd trailing tile spans the full width so the grid stays balanced. */}
      {visibleQuestions.length > 0 && (
        <motion.div className="mt-auto grid grid-cols-2 gap-2 pt-6" variants={container}>
          {visibleQuestions.map((q, i) => {
            const fullWidth = orphanLast && i === visibleQuestions.length - 1
            const label = sqLabel(q)
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => onSelect(q, i)}
                variants={item}
                className={`group relative flex min-h-[64px] flex-col justify-end overflow-hidden border border-gray-200 bg-white p-3 text-left text-sm font-medium leading-snug text-gray-800${fullWidth ? ' col-span-2' : ''}`}
                style={{ borderRadius: radius, ...bubbleBorder }}
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
                <span className="relative">{label}</span>
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
