'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { readableTextColor, isLightColor } from '@/lib/utils'
import { QuickActionButtons, type QuickActionsVariant } from './QuickActionButtons'
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
  /** Bot bubble surface color — greeting card + action tiles follow it so a
   *  dark theme stays dark on the welcome screen too. */
  botBubbleColor?: string
  bubbleRadius?: number
  /** Frosted-glass greeting bubble (translucent + backdrop blur). */
  glassBubbles?: boolean
  /** Optional border on the greeting bubble + action tiles (width 0 = none). */
  bubbleBorderColor?: string
  bubbleBorderWidth?: number
  /** Component-library variant for the action buttons (quick-actions). */
  quickActionsVariant?: QuickActionsVariant
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
  botBubbleColor,
  bubbleRadius = 16,
  glassBubbles = false,
  bubbleBorderColor = '#e5e7eb',
  bubbleBorderWidth = 0,
  quickActionsVariant = 'default',
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
  // Surface for the greeting card + action tiles: the bot-bubble color when
  // set, else the scheme-appropriate default. Never light-on-dark.
  const surface = botBubbleColor || (darkBg ? 'rgba(255,255,255,0.08)' : undefined)
  const surfaceText = botBubbleColor
    ? readableTextColor(botBubbleColor)
    : darkBg
      ? '#f4f4f5'
      : undefined
  const surfaceStyle = !glassBubbles && surface ? { backgroundColor: surface, color: surfaceText } : {}
  const glassClasses = darkBg
    ? 'bg-white/10 backdrop-blur-md ring-1 ring-white/15'
    : 'bg-white/40 backdrop-blur-md ring-1 ring-white/50'
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
          className={`mt-5 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            glassBubbles ? glassClasses : surface ? '' : 'bg-gray-100'
          } ${glassBubbles && darkBg ? 'text-gray-50' : surface ? '' : 'text-gray-800'}`}
          style={{ borderRadius: radius, ...bubbleBorder, ...surfaceStyle }}
          variants={item}
        >
          {greeting}
        </motion.div>
      ) : null}

      {/* Suggested-action buttons — component-library 'quick-actions' variants. */}
      <QuickActionButtons
        questions={suggestedQuestions}
        variant={quickActionsVariant}
        primaryColor={primaryColor}
        accentColor={accentColor}
        radius={radius}
        glassBubbles={glassBubbles}
        glassClasses={glassClasses}
        hasSurface={Boolean(surface)}
        surfaceStyle={surfaceStyle}
        bubbleBorder={bubbleBorder}
        darkBg={darkBg}
        onSelect={onSelect}
      />
    </motion.div>
  )
}
