'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { EmailCapture } from './EmailCapture'
import { HeroVideo } from './HeroVideo'

export function Hero() {
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-[#101213] text-white">
      {/* Full-bleed hero: fox walks in once, then loops idle (see HeroVideo) */}
      <HeroVideo />
      {/* Slight left-side dark fade so the copy stays legible over the bright scene */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#101213] via-[#101213]/45 to-transparent"
        aria-hidden="true"
      />
      {/* Copy — overlaid on the darkened left */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pt-32 pb-16">
        <div className="max-w-2xl">
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
            className="text-balance font-[family-name:var(--font-jakarta)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.75rem]"
          >
            Answer every customer,
            <br />
            <span className="font-[family-name:var(--font-lora)] font-medium italic tracking-normal text-primary">
              <span className="relative inline-block">
                day or night
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-[0.08em] h-[0.06em] rounded-full bg-primary/70"
                />
              </span>
              .
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl"
          >
            Your always-on AI agent for chat &amp; voice — answering questions, capturing leads, and
            looking up orders 24/7, so customers never wait. Live in one line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-8"
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
