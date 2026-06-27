'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

// Chat-view design screenshots (public/chatviews). All 836×1356 (portrait).
const IMAGES = [
  { src: '/chatviews/chatview-0.png', alt: 'Loqara chat widget design' },
  { src: '/chatviews/chatview-1.png', alt: 'Loqara chat widget design' },
  { src: '/chatviews/chatview-2.png', alt: 'Loqara chat widget design' },
  { src: '/chatviews/chatview-3.png', alt: 'Loqara chat widget design' },
  { src: '/chatviews/chatview-4.png', alt: 'Loqara chat widget design' },
  { src: '/chatviews/chatview-5.png', alt: 'Loqara chat widget design' },
]

export function Showcase() {
  const reduce = useReducedMotion()
  const [current, setCurrent] = useState(Math.floor(IMAGES.length / 2))

  const next = useCallback(() => setCurrent((i) => (i + 1) % IMAGES.length), [])
  const prev = useCallback(() => setCurrent((i) => (i - 1 + IMAGES.length) % IMAGES.length), [])

  // Auto-advance, paused under reduced motion.
  useEffect(() => {
    if (reduce) return
    const t = setInterval(next, 4000)
    return () => clearInterval(t)
  }, [next, reduce])

  return (
    <section id="showcase" className="scroll-mt-20 bg-[#101213] text-white">
      <div className="relative mx-auto max-w-6xl overflow-hidden px-5 py-20">
        {/* Soft brand glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute left-1/2 top-8 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(233,118,52,0.35),rgba(0,0,0,0)_70%)] blur-2xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Showcase</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            A widget that fits your brand
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Colors, backgrounds, glass, product cards and voice — a glimpse of the chat experiences you can ship.
          </p>
        </div>

        {/* Coverflow carousel */}
        <div className="relative mt-12 flex h-[440px] items-center justify-center md:h-[540px]">
          <div className="relative flex h-full w-full items-center justify-center [perspective:1200px]">
            {IMAGES.map((image, index) => {
              const total = IMAGES.length
              let pos = ((index - current) + total) % total
              if (pos > Math.floor(total / 2)) pos -= total
              const isCenter = pos === 0
              const isAdjacent = Math.abs(pos) === 1

              return (
                <div
                  key={image.src}
                  className="absolute aspect-[836/1356] w-[210px] transition-all duration-500 ease-out md:w-[300px]"
                  style={{
                    transform: `translateX(${pos * 52}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -10}deg)`,
                    zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                    opacity: isCenter ? 1 : isAdjacent ? 0.45 : 0,
                    filter: isCenter ? 'none' : 'blur(3px)',
                    visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    className="h-full w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
                  />
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={prev}
            aria-label="Previous design"
            className="absolute left-0 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:left-4"
          >
            <ChevronLeftIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next design"
            className="absolute right-0 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 sm:right-4"
          >
            <ChevronRightIcon className="size-5" />
          </button>
        </div>

        {/* Dots */}
        <div className="relative z-10 mt-8 flex justify-center gap-2">
          {IMAGES.map((image, i) => (
            <button
              key={image.src}
              type="button"
              aria-label={`Go to design ${i + 1}`}
              aria-current={i === current}
              onClick={() => setCurrent(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === current ? 'w-6 bg-primary' : 'w-1.5 bg-white/30 hover:bg-white/50',
              )}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
