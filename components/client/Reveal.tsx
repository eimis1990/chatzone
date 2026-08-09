'use client'

import type { ReactNode } from 'react'
import { motion, MotionConfig } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * Entrance micro-animation for server-rendered blocks: a soft fade with a
 * small rise (or a slide from the right). reducedMotion="user" strips the
 * movement for users who ask for it while keeping the fade.
 */
export function Reveal({
  children,
  delay = 0,
  from = 'up',
  duration = 0.5,
  className,
}: {
  children: ReactNode
  delay?: number
  from?: 'up' | 'right'
  duration?: number
  className?: string
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, x: from === 'right' ? 56 : 0, y: from === 'up' ? 14 : 0 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}
