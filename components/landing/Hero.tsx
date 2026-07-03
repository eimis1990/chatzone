'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { GetStartedDialog } from './GetStartedDialog'
import { HeroVideo } from './HeroVideo'

/**
 * TEMPORARY design explorer: 5 headline typography variations (same copy &
 * colors, different faces, all sized down from the original). The vertical
 * 1–5 tabs on the right switch them live; the pick persists in localStorage.
 * Once a winner is chosen, keep that variant's JSX and delete the rest + tabs.
 */
const VARIANT_NAMES = [
  'Archivo · compact classic',
  'Geist · marker highlight',
  'Nunito · friendly rounded',
  'Jakarta · icon chips',
  'Poppins × Mono · typed',
]

export function Hero() {
  const [variant, setVariant] = useState(0)

  // Restore the reviewer's last pick (after mount — avoids hydration mismatch).
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem('cbz_hero_variant'))
      if (Number.isInteger(saved) && saved >= 0 && saved < VARIANT_NAMES.length) setVariant(saved)
    } catch {
      /* ignore */
    }
  }, [])

  const pickVariant = (i: number) => {
    setVariant(i)
    try {
      localStorage.setItem('cbz_hero_variant', String(i))
    } catch {
      /* ignore */
    }
  }

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
          {/* Eyebrow — re-keyed per variant so it re-animates on switch */}
          <motion.div
            key={`eyebrow-${variant}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            {variant === 1 ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/85 backdrop-blur-sm">
                <span aria-hidden="true">💬</span> Chat
                <span className="text-white/30" aria-hidden="true">·</span>
                <span aria-hidden="true">🎙️</span> Voice
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-green-400">always on</span>
              </span>
            ) : variant === 4 ? (
              <span className="inline-flex items-center gap-2.5 font-[family-name:var(--font-geist-mono)] text-xs text-green-400">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative size-1.5 rounded-full bg-green-400" />
                </span>
                {'>'} always_on · 24/7
              </span>
            ) : (
              <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-green-400">
                <span className="relative flex size-2 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative size-1.5 rounded-full bg-green-400" />
                </span>
                Always on · 24/7
              </span>
            )}
          </motion.div>

          {/* Headline — 5 typography variations, same copy & colors */}
          <motion.h1
            key={`h1-${variant}`}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={
              [
                // 1 — Archivo Black, compact classic (original, sized down)
                'text-balance font-[family-name:var(--font-archivo-black)] text-[2rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.6rem] xl:text-[4.1rem]',
                // 2 — Geist grotesque, extra bold
                'text-balance font-[family-name:var(--font-geist-sans)] text-[1.9rem] font-extrabold leading-[1.1] tracking-tight sm:text-[2.75rem] lg:text-[3.4rem] xl:text-[3.8rem]',
                // 3 — Nunito, friendly rounded
                'text-balance font-[family-name:var(--font-nunito)] text-[2rem] font-extrabold leading-[1.12] sm:text-5xl lg:text-[3.5rem] xl:text-[3.9rem]',
                // 4 — Plus Jakarta Sans, sharp + chips
                'text-balance font-[family-name:var(--font-jakarta)] text-[1.85rem] font-bold leading-[1.14] tracking-tight sm:text-[2.6rem] lg:text-[3.25rem] xl:text-[3.6rem]',
                // 5 — Poppins with a typed mono accent
                'text-balance font-[family-name:var(--font-poppins)] text-[1.85rem] font-semibold leading-[1.15] sm:text-[2.6rem] lg:text-[3.2rem] xl:text-[3.5rem]',
              ][variant]
            }
          >
            {variant === 0 && (
              <>
                Your AI chat &amp; voice agent,
                <br />
                <span className="font-[family-name:var(--font-lora)] font-medium italic tracking-normal text-primary">
                  <span className="relative inline-block">
                    day and night
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 300 22"
                      preserveAspectRatio="none"
                      className="absolute inset-x-0 top-full h-[0.3em] w-full overflow-visible text-primary"
                    >
                      <path d="M5 13 C 92 5, 208 5, 295 9 C 208 16, 92 17, 5 13 Z" fill="currentColor" />
                    </svg>
                  </span>
                  !
                </span>
              </>
            )}
            {variant === 1 && (
              <>
                Your AI chat &amp; voice agent,
                <br />
                <span className="inline-block -rotate-1 rounded-xl bg-primary px-3 py-0.5 text-white sm:px-4">
                  day and night!
                </span>
              </>
            )}
            {variant === 2 && (
              <>
                Your AI chat &amp; voice agent,
                <br />
                <span className="text-primary">
                  day and night!{' '}
                  <span className="align-baseline text-[0.72em]" aria-hidden="true">
                    ☀️🌙
                  </span>
                </span>
              </>
            )}
            {variant === 3 && (
              <>
                Your AI chat{' '}
                <span
                  className="inline-flex -rotate-3 items-center justify-center rounded-xl bg-white/10 px-1.5 align-middle text-[0.62em] ring-1 ring-white/15"
                  aria-hidden="true"
                >
                  💬
                </span>{' '}
                &amp; voice{' '}
                <span
                  className="inline-flex rotate-3 items-center justify-center rounded-xl bg-white/10 px-1.5 align-middle text-[0.62em] ring-1 ring-white/15"
                  aria-hidden="true"
                >
                  🎙️
                </span>{' '}
                agent,
                <br />
                <span className="bg-gradient-to-r from-primary via-[#f59a3c] to-primary bg-clip-text font-extrabold text-transparent">
                  day and night!
                </span>
              </>
            )}
            {variant === 4 && (
              <>
                Your AI chat &amp; voice agent,
                <br />
                <span className="font-[family-name:var(--font-geist-mono)] text-[0.9em] font-medium text-primary">
                  day and night!
                  <span className="motion-safe:animate-pulse" aria-hidden="true">
                    ▌
                  </span>
                </span>
              </>
            )}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 max-w-xl text-base leading-relaxed text-white/80 sm:mt-6 sm:text-lg xl:max-w-2xl xl:text-xl"
          >
            Your always-on AI agent for chat &amp; voice — answering questions, capturing leads, and
            looking up orders 24/7, so customers never wait. Live in one line of code.
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
            <p className="mt-3 text-sm text-white/60">Free to start · Live in one line of code</p>
          </motion.div>
        </div>
      </div>

      {/* TEMPORARY: variant switcher — vertical 1–5 tabs, right edge */}
      <div className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-2 md:flex lg:right-5">
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Aa
        </span>
        {VARIANT_NAMES.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => pickVariant(i)}
            title={name}
            aria-label={`Hero style ${i + 1}: ${name}`}
            aria-pressed={variant === i}
            className={`flex size-9 items-center justify-center rounded-full border text-sm font-semibold backdrop-blur-sm transition-all ${
              variant === i
                ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30'
                : 'border-white/15 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            }`}
          >
            {i + 1}
          </button>
        ))}
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
