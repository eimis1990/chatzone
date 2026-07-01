'use client'

import { motion } from 'framer-motion'
import SocialCards from '@/components/ui/card-fan-carousel'
import { Shimmer } from './Shimmer'

const TITLE_LINES = ['A widget that fits', 'your brand']
const DESCRIPTION =
  'Tweak colors, shapes, backgrounds, voice and more — then push it live to your site in one click. Want something bespoke? Custom designs on request.'

const FADE_IN = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

/** Showcase variant: a fanned, draggable card carousel on a white background. */
export function ShowcaseFan({ images }: { images: string[] }) {
  const cards = images.map((src, i) => ({ imgUrl: src, alt: `Loqara chat widget design ${i + 1}` }))

  return (
    // `isolate` keeps the fan cards' z-indexes inside this section's own stacking
    // context so they never paint over the fixed header.
    <section id="showcase" className="isolate overflow-x-clip bg-white text-gray-900 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-5 pt-24 text-center">
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
          className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl"
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
          className="mx-auto mt-6 max-w-xl text-lg text-gray-600"
        >
          {DESCRIPTION}
        </motion.p>
      </div>

      <div className="mx-auto mt-14 max-w-6xl px-5">
        <SocialCards cards={cards} />
      </div>

      {/* CTA sits under the carousel + its dots. */}
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={FADE_IN}
        className="flex justify-center px-5 pb-28 pt-12"
      >
        <motion.a
          href="#get-started"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
        >
          <span className="relative z-10">Get started</span>
          <Shimmer />
        </motion.a>
      </motion.div>
    </section>
  )
}
