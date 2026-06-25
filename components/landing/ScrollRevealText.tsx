'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion'

function Word({
  children,
  progress,
  range,
}: {
  children: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const opacity = useTransform(progress, range, [0.15, 1])
  return (
    <span className="mr-[0.25em] inline-block">
      <motion.span style={{ opacity }}>{children}</motion.span>
    </span>
  )
}

/**
 * A "Solution"-style feature text block: an accent vertical line that fills as
 * the row scrolls, a number, a title, and a paragraph whose words fill from
 * light grey to solid — all driven by one shared scroll progress.
 */
export function FeatureText({
  number,
  title,
  body,
  accent,
}: {
  number: string
  title: string
  body: string
  accent: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'start 0.4'] })
  const fillHeight = useTransform(scrollYProgress, [0, 0.85], ['0%', '100%'])
  const words = body.split(' ')

  return (
    <div ref={ref} className="relative pl-6 sm:pl-8">
      {/* Line: grey track + accent fill that grows with scroll */}
      <span className="absolute left-0 top-0 h-full w-0.5 rounded-full bg-gray-200" aria-hidden="true" />
      <motion.span
        className="absolute left-0 top-0 w-0.5 rounded-full"
        style={{ height: fillHeight, backgroundColor: accent }}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold tracking-[0.2em]" style={{ color: accent }}>
        — {number}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">{title}</h2>
      <p className="mt-5 text-xl leading-relaxed text-gray-900 sm:text-2xl">
        {words.map((word, i) => {
          const start = i / words.length
          const end = start + 1 / words.length
          return (
            <Word key={i} progress={scrollYProgress} range={[start, end]}>
              {word}
            </Word>
          )
        })}
      </p>
    </div>
  )
}
