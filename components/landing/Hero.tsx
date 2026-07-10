'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { GetStartedDialog } from './GetStartedDialog'
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
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#101213] via-[#101213]/70 via-[68%] to-transparent sm:via-[#101213]/60 sm:via-[58%]"
        aria-hidden="true"
      />
      {/* Mobile-only bottom scrim — the copy sits at the bottom on mobile, so darken
          there (keeps the freed-up top bright, revealing the fox's face). */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#101213] via-[#101213]/70 to-transparent sm:hidden"
        aria-hidden="true"
      />
      {/* Copy — overlaid on the darkened left */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-end px-5 pt-28 pb-10 sm:items-center sm:pt-32 sm:pb-16">
        <div className="flex max-w-2xl flex-col xl:max-w-3xl">
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
            AI voice + chat · always on
          </motion.div>

          {/* Headline — Plus Jakarta Sans with inline chat/voice icon chips and a
              gradient accent on the closing line. */}
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-balance font-[family-name:var(--font-jakarta)] text-[2.15rem] font-bold leading-[1.13] tracking-tight sm:text-[3rem] lg:text-[3.75rem] xl:text-[4.25rem]"
          >
            Let your customers
            <br />
            <span className="bg-gradient-to-r from-primary via-[#f59a3c] to-primary bg-clip-text font-extrabold text-transparent">
              talk to your store.
            </span>{' '}
            <span
              className="inline-flex rotate-3 items-center justify-center rounded-xl bg-white/10 px-2 py-0.5 align-middle text-[0.5em] ring-1 ring-white/15"
              aria-hidden="true"
            >
              🎙️
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:mt-6 sm:text-lg xl:max-w-2xl xl:text-xl"
          >
            Loqara gives your store a real voice agent — shoppers ask out loud and hear answers
            from your products, policies, and live order status. Prefer to type? The same AI handles
            chat.
            <br />
            <span className="font-medium text-primary">
              Easiest chat view customization on the market!
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-7 sm:mt-8"
          >
            <GetStartedDialog
              source="hero"
              shimmer
              triggerClassName="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover sm:h-14 sm:px-10 sm:text-base"
            />
            <p className="mt-3 text-sm text-white/60">Free to start · add voice when you&apos;re ready</p>
          </motion.div>
        </div>
      </div>

      <BrandMarquee />
    </section>
  )
}

// Real integrations & tech the product runs on — honest credibility, not
// invented customer logos.
const BRANDS = [
  'WooCommerce',
  'Shopify',
  'Magento',
  'WordPress',
  'OpenAI',
  'ElevenLabs',
  'Stripe',
  'Supabase',
]

// One marquee copy must be wider than the viewport, or the two-copy -50% loop
// reveals empty space mid-scroll. Repeating the short brand list guarantees a
// single copy overflows even ultra-wide screens, so the loop reads as endless.
const LOOP = [...BRANDS, ...BRANDS, ...BRANDS]

/** Infinite, seamlessly-looping row of brand wordmarks across the hero bottom. */
function BrandMarquee() {
  const reduce = useReducedMotion()
  return (
    <div className="relative z-10 w-full overflow-hidden border-t border-white/10 bg-black/30 py-6 shadow-[0_-1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
        Works with the tools you already use
      </p>
      {/* Fade the logos into the dark glass at both edges (dark, not the bright image). */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#101213] via-[#101213]/85 to-transparent sm:w-40" />
      <div
        className="flex w-max"
        style={reduce ? undefined : { animation: 'brand-marquee 120s linear infinite' }}
      >
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1}>
            {LOOP.map((b, i) => (
              <li
                key={`${b}-${i}`}
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
