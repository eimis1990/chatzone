'use client'

import { useRef, type ReactNode } from 'react'
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
 * One continuous vertical line down the center of the whole features stack:
 * a grey track plus an accent fill that grows as the section scrolls by.
 * Hidden on mobile where the rows stack.
 */
export function FeatureSpine({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.8', 'end 0.8'] })
  const fillHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])
  return (
    <div ref={ref} className="relative">
      <span
        className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gray-200 lg:block"
        aria-hidden="true"
      />
      <motion.span
        className="absolute left-1/2 top-0 z-10 hidden w-0.5 -translate-x-1/2 lg:block"
        style={{ height: fillHeight, backgroundColor: 'var(--primary)' }}
        aria-hidden="true"
      >
        {/* Glowing tip so the line's progress stays visible on dark imagery */}
        <span
          className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full"
          style={{
            backgroundColor: 'var(--primary)',
            boxShadow: '0 0 10px 3px color-mix(in srgb, var(--primary) 80%, transparent)',
          }}
        />
      </motion.span>
      {children}
    </div>
  )
}

/**
 * Feature text block: a number, a title, and a paragraph whose words fill from
 * light grey to solid as the row scrolls. (The accent line lives in
 * FeatureSpine — one continuous line for the whole section.)
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
  const words = body.split(' ')

  return (
    <div ref={ref}>
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
