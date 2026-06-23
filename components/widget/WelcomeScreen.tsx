'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { readableTextColor } from '@/lib/utils'

interface WelcomeScreenProps {
  displayName: string
  tagline?: string
  avatarUrl?: string
  greeting: string
  suggestedQuestions: string[]
  primaryColor: string
  bubbleRadius?: number
  onSelect: (q: string) => void
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
  bubbleRadius = 16,
  onSelect,
}: WelcomeScreenProps) {
  const radius = `${Math.min(bubbleRadius, 16)}px`
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
            className="size-16 rounded-full object-cover ring-1 ring-black/5"
          />
        ) : (
          <div
            className="flex size-16 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
            aria-hidden="true"
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="mt-3 text-lg font-bold text-gray-900">{displayName}</h2>
        {tagline ? <p className="mt-0.5 text-sm text-gray-500">{tagline}</p> : null}
      </motion.div>

      {/* Welcome message card */}
      {greeting ? (
        <motion.div
          className="mt-5 bg-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap"
          style={{ borderRadius: radius }}
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
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => onSelect(q)}
                variants={item}
                className={`relative flex min-h-[84px] flex-col justify-end overflow-hidden bg-gray-50 p-3 text-left text-sm font-medium leading-snug text-gray-800 transition-colors hover:bg-gray-100${fullWidth ? ' col-span-2' : ''}`}
                style={{ borderRadius: radius }}
              >
                {/* Soft glow in the top-right corner, tinted to the header color */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-5 -top-5 size-16 rounded-full blur-2xl"
                  style={{ backgroundColor: primaryColor, opacity: 0.22 }}
                />
                <span className="relative">{q}</span>
              </motion.button>
            )
          })}
        </motion.div>
      )}
    </motion.div>
  )
}
