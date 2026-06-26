'use client'

import { motion, useReducedMotion } from 'framer-motion'

/**
 * A "shiny button" sweep — a diagonal highlight that periodically glides across.
 * Drop inside any `relative overflow-hidden` button; it clips to the button's
 * shape and is disabled under reduced-motion.
 */
export function Shimmer() {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
      <motion.span
        className="absolute inset-y-0 left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
        initial={{ x: '-180%' }}
        animate={{ x: '520%' }}
        transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 2.6, ease: 'easeInOut' }}
      />
    </span>
  )
}
