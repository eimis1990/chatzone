'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { EmailCapture } from './EmailCapture'
import { HeroVideo } from './HeroVideo'

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-[#101213] text-white">
      {/* Full-bleed hero: fox walks in once, then loops idle (see HeroVideo) */}
      <HeroVideo />
      {/* Left-side dark fade so the copy stays legible over the bright scene.
          Stronger + reaching further right on mobile (text is wider there); the
          far right stays clear so the fox is still visible. */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#101213] via-[#101213]/70 via-[68%] to-transparent sm:via-[#101213]/45 sm:via-[50%]"
        aria-hidden="true"
      />
      {/* Mobile-only top scrim — darkens behind the nav/headline without dimming the fox lower-right. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-[#101213]/80 to-transparent sm:hidden"
        aria-hidden="true"
      />
      {/* Copy — overlaid on the darkened left */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-stretch px-5 pt-28 pb-10 sm:items-center sm:pt-32 sm:pb-16">
        <div className="flex max-w-2xl flex-col">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-green-400"
          >
            <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative size-1.5 rounded-full bg-green-400" />
            </span>
            Always on · 24/7
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance font-[family-name:var(--font-jakarta)] text-[2.5rem] font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.75rem]"
          >
            Answer every customer,
            <br />
            <span className="font-[family-name:var(--font-lora)] font-medium italic tracking-normal text-primary">
              <span className="relative inline-block">
                day and night
                {/* Hand-drawn underline: wavy stroke, full-opacity accent, constant
                    thickness (non-scaling-stroke) while it stretches to the text. */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 300 22"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 top-full h-[0.3em] w-full overflow-visible text-primary"
                >
                  {/* Filled, tapered ribbon = brush stroke (thick middle, pointed ends),
                      arched upward (the bend flipped vs the previous pencil line). */}
                  <path d="M5 13 C 92 5, 208 5, 295 9 C 208 16, 92 17, 5 13 Z" fill="currentColor" />
                </svg>
              </span>
              !
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:mt-6 sm:text-xl"
          >
            Your always-on AI agent for chat &amp; voice — answering questions, capturing leads, and
            looking up orders 24/7, so customers never wait. Live in one line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-auto pt-8 sm:mt-8 sm:pt-0"
          >
            <EmailCapture source="hero" />
          </motion.div>
        </div>
      </div>

      <BrandMarquee />
    </section>
  )
}

const BRANDS = [
  'Aromama',
  'Nordbaltic',
  'ACTION!',
  'Klaipėda Goods',
  'Baltic Skincare',
  'Vilnius Roastery',
  'Lumora',
  'Saulė & Co',
]

/** Infinite, seamlessly-looping row of brand wordmarks across the hero bottom. */
function BrandMarquee() {
  const reduce = useReducedMotion()
  return (
    <div className="relative z-10 w-full overflow-hidden border-t border-white/10 bg-black/30 py-6 shadow-[0_-1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
      {/* Fade the logos into the dark glass at both edges (dark, not the bright image). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div
        className="flex w-max"
        style={reduce ? undefined : { animation: 'brand-marquee 40s linear infinite' }}
      >
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1}>
            {BRANDS.map((b) => (
              <li
                key={b}
                className="whitespace-nowrap text-2xl font-semibold tracking-tight text-white/60 transition-colors hover:text-white"
              >
                {b}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
