'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, type PanInfo } from 'framer-motion'

export interface SocialCard {
  imgUrl: string
  alt?: string
}

interface SocialCardsProps {
  cards: SocialCard[]
  className?: string
  /** Auto-advance the fan (pauses on hover / interaction). */
  autoPlay?: boolean
  autoPlayMs?: number
}

// How many cards stay visible on each side of the centered one.
const WINGS = 3
// Card aspect ratio (height / width) — Loqara chat views are 418 × 678.
const RATIO = 678 / 418
// The centered card zooms in slightly to draw the eye.
const CENTER_SCALE = 1.06

/**
 * A fanned, draggable card carousel: the active card sits upright, centered and
 * zoomed in; its neighbours rotate and dip away along an arc. Cards are NOT
 * clipped — each chat view keeps its own corner radius and casts a soft shadow.
 * Swipe, click a side card, use the arrows below, or arrow keys. Wraps endlessly.
 */
export default function SocialCards({
  cards,
  className = '',
  autoPlay = true,
  autoPlayMs = 3800,
}: SocialCardsProps) {
  const reduce = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [cardW, setCardW] = useState(260)
  const [paused, setPaused] = useState(false)

  const n = cards.length

  // Responsive card width derived from the container.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const apply = () => setCardW(Math.max(200, Math.min(300, Math.round(el.clientWidth * 0.28))))
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const go = useCallback((dir: number) => setActive((a) => ((a + dir) % n + n) % n), [n])

  // Gentle autoplay; paused on hover or when motion is reduced.
  useEffect(() => {
    if (!autoPlay || reduce || paused || n <= 1) return
    const t = setInterval(() => setActive((a) => (a + 1) % n), autoPlayMs)
    return () => clearInterval(t)
  }, [autoPlay, reduce, paused, n, autoPlayMs])

  if (n === 0) return null

  const cardH = Math.round(cardW * RATIO)
  const spacing = cardW * 0.7
  const dip = cardW * 0.05
  const stageH = Math.round(cardH * CENTER_SCALE) + 48

  // Signed distance from the active card, wrapping around the ends.
  const offsetOf = (i: number) => {
    let off = i - active
    if (off > n / 2) off -= n
    if (off < -n / 2) off += n
    return off
  }

  const onDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -350) go(1)
    else if (info.offset.x > 60 || info.velocity.x > 350) go(-1)
  }

  const arrow = (dir: 1 | -1, label: string, d: string) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => go(dir)}
      className="flex size-10 items-center justify-center rounded-full border border-black/10 bg-white text-gray-700 shadow-sm transition hover:border-black/20 hover:text-gray-900"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d={d} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )

  return (
    <div
      ref={containerRef}
      className={`w-full select-none ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(1)
        if (e.key === 'ArrowLeft') go(-1)
      }}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Widget designs"
    >
      {/* Draggable stage. Cards are absolutely positioned and animate to their
          fan transform; a tap (no movement) focuses a side card. */}
      <motion.div
        className="relative cursor-grab active:cursor-grabbing"
        style={{ height: stageH, touchAction: 'pan-y' }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragEnd={onDragEnd}
      >
        {cards.map((card, i) => {
          const off = offsetOf(i)
          const abs = Math.abs(off)
          const hidden = abs > WINGS
          return (
            <motion.button
              key={i}
              type="button"
              aria-label={card.alt || `Design ${i + 1}`}
              aria-hidden={hidden}
              tabIndex={off === 0 ? 0 : -1}
              onClick={() => off !== 0 && setActive(i)}
              className="absolute left-1/2 top-1/2 bg-transparent"
              style={{
                width: cardW,
                height: cardH,
                marginLeft: -cardW / 2,
                marginTop: -cardH / 2,
                pointerEvents: hidden ? 'none' : 'auto',
                cursor: off === 0 ? 'grab' : 'pointer',
              }}
              initial={false}
              animate={{
                x: off * spacing,
                y: abs * dip,
                rotate: off * 6,
                scale: off === 0 ? CENTER_SCALE : Math.max(0.78, 1 - abs * 0.09),
                opacity: hidden ? 0 : 1,
                zIndex: 100 - abs,
              }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
            >
              {/* Not clipped/rounded — the image keeps its own corner radius and
                  transparent corners; the drop shadow follows its shape. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.imgUrl}
                alt={card.alt || ''}
                draggable={false}
                loading="lazy"
                className="pointer-events-none h-full w-full object-contain drop-shadow-[0_22px_45px_rgba(15,18,19,0.28)]"
                style={{ opacity: off === 0 ? 1 : 0.94 }}
              />
            </motion.button>
          )
        })}
      </motion.div>

      {/* Controls: arrows flanking the progress dots, below the fan. */}
      <div className="mt-8 flex items-center justify-center gap-4">
        {arrow(-1, 'Previous', 'M15 18l-6-6 6-6')}
        <div className="flex items-center gap-2">
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to design ${i + 1}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all ${
                i === active ? 'w-6 bg-primary' : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
        {arrow(1, 'Next', 'M9 6l6 6-6 6')}
      </div>
    </div>
  )
}
