'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { CheckIcon, ArrowDownRightIcon } from 'lucide-react'
import { EmailCapture } from './EmailCapture'

export function Hero() {
  const reduce = useReducedMotion()
  return (
    <section className="relative flex min-h-svh flex-col overflow-hidden bg-[#101213] text-white">
      <div className="relative mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pt-32 pb-12 lg:grid-cols-[1.55fr_1fr] lg:gap-16 lg:pt-36 lg:pb-16">
        {/* Copy */}
        <div>
          <motion.h1
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl font-semibold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl"
          >
            Answer every customer,
            <br />
            <span className="text-[#9BDA48]">day or night.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-xl text-xl leading-relaxed text-white/75"
          >
            A chat &amp; voice agent that knows your products, captures leads, looks up orders, and
            hands off to your team — embedded with one line of code.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex items-center gap-2 text-sm text-[#a9d6b4]"
          >
            <CheckIcon className="size-4" />
            Free while in early access — no credit card required.
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-5"
          >
            <EmailCapture source="hero" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-white/60"
          >
            <ArrowDownRightIcon className="size-3.5" />
            It&apos;s live on this page — try the chat bubble in the corner.
          </motion.p>
        </div>

        {/* Product screenshot */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[300px]"
        >
          <img
            src="/landing/chatzone-chatview.png"
            alt="Chatzone chat widget"
            className="w-full rounded-3xl shadow-2xl ring-1 ring-white/10"
          />
        </motion.div>
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
    <div className="relative w-full overflow-hidden border-t border-white/10 py-6">
      {/* Fade the logos into the dark background at both edges. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#101213] to-transparent sm:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#101213] to-transparent sm:w-32" />
      <div
        className="flex w-max"
        style={reduce ? undefined : { animation: 'brand-marquee 40s linear infinite' }}
      >
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={copy === 1}>
            {BRANDS.map((b) => (
              <li
                key={b}
                className="whitespace-nowrap text-2xl font-semibold tracking-tight text-white/45 transition-colors hover:text-white"
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
