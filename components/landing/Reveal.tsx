'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  /** Stagger delay in seconds. */
  delay?: number
  /** Slide-up distance in px (default 16). */
  y?: number
}

interface RevealSlideProps {
  children: ReactNode
  className?: string
  /** Which side the content drifts in from. */
  from?: 'left' | 'right'
  /** Horizontal travel in px (default 64 — a gentle drift, not a fly-in). */
  distance?: number
}

/**
 * Scroll-linked drift: the content starts slightly off toward one side and
 * eases into its resting position as it scrolls up into view. Progress is
 * tied to scroll (not a one-shot trigger), smoothed with a spring so the
 * motion feels fluid in both directions.
 */
export function RevealSlide({ children, className, from = 'left', distance = 64 }: RevealSlideProps) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    // 0 when the element's top reaches the viewport bottom, 1 when it is 45% up.
    offset: ['start end', 'start 45%'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, mass: 0.6 })
  const x = useTransform(progress, [0, 1], [from === 'left' ? -distance : distance, 0])
  const opacity = useTransform(progress, [0, 0.4, 1], [0, 0.75, 1])

  if (reduce) {
    return <div className={className}>{children}</div>
  }
  return (
    <motion.div ref={ref} className={className} style={{ x, opacity }}>
      {children}
    </motion.div>
  )
}

/** Fades + slides content up when it scrolls into view (once). */
export function Reveal({ children, className, delay = 0, y = 16 }: RevealProps) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
