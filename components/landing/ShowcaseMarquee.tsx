'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Shimmer } from './Shimmer'

const TITLE_LINES = ['A widget that fits', 'your brand']
const DESCRIPTION =
  'Tweak colors, shapes, backgrounds, voice and more — then push it live to your site in one click. Want something bespoke? Custom designs on request.'

const FADE_IN = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

export function ShowcaseMarquee({ images }: { images: string[] }) {
  const reduce = useReducedMotion()
  // Duplicate the set; each card carries its own right margin, so the two halves
  // are identical and animating x to -50% loops with no visible reset.
  const row = [...images, ...images]
  // Keep scroll speed steady regardless of how many images are in the folder.
  const duration = Math.max(20, images.length * 6)

  return (
    <section id="showcase" className="overflow-x-clip bg-black text-white scroll-mt-20">
      {/* Centered heading block */}
      <div className="mx-auto max-w-3xl px-5 pt-24 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl"
        >
          {TITLE_LINES.map((line, li) => (
            <span key={li} className="block">
              {line.split(' ').map((word, wi) => (
                <motion.span key={wi} variants={FADE_IN} className="inline-block">
                  {word}&nbsp;
                </motion.span>
              ))}
            </span>
          ))}
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={FADE_IN}
          transition={{ delay: 0.35 }}
          className="mx-auto mt-6 max-w-xl text-lg text-white/70"
        >
          {DESCRIPTION}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={FADE_IN}
          transition={{ delay: 0.45 }}
        >
          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative mt-8 inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
          >
            <span className="relative z-10">Get started</span>
            <Shimmer />
          </motion.a>
        </motion.div>
      </div>

      {/* Full-bleed scrolling marquee. Cards overflow vertically (not clipped);
          edges fade via gradient overlays instead of a clipping mask. */}
      <div className="relative mt-14 pb-24">
        {/* Edge fades — taller than the band so they also cover the card tops
            that overflow above it. */}
        <div className="pointer-events-none absolute -top-16 bottom-0 left-0 z-10 w-16 bg-gradient-to-r from-black to-transparent md:w-32" />
        <div className="pointer-events-none absolute -top-16 bottom-0 right-0 z-10 w-16 bg-gradient-to-l from-black to-transparent md:w-32" />
        <motion.div
          className="flex w-max"
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={reduce ? undefined : { ease: 'linear', duration, repeat: Infinity }}
        >
          {row.map((src, index) => (
            <div
              key={index}
              className="mr-5 flex-shrink-0"
              style={{ rotate: `${index % 2 === 0 ? -2 : 3}deg` }}
            >
              {/* No rounding — each chat view keeps its own corner radius. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Loqara chat widget design"
                loading="lazy"
                className="h-64 w-auto drop-shadow-2xl md:h-80"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
