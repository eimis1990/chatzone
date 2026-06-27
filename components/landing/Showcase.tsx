'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Shimmer } from './Shimmer'

// Chat-view design screenshots (public/chatviews), optimized to WebP.
const IMAGES = [
  '/chatviews/chatview-0.webp',
  '/chatviews/chatview-1.webp',
  '/chatviews/chatview-2.webp',
  '/chatviews/chatview-3.webp',
  '/chatviews/chatview-4.webp',
  '/chatviews/chatview-5.webp',
]

const TITLE = 'A widget that fits your brand'
const DESCRIPTION =
  'Colors, backgrounds, glass, product cards and voice — a glimpse of the chat experiences you can ship.'

const FADE_IN = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

export function Showcase() {
  const reduce = useReducedMotion()
  const marquee = [...IMAGES, ...IMAGES]

  return (
    <section
      id="showcase"
      className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-[#101213] px-4 py-24 text-center text-white scroll-mt-20"
    >
      <div className="relative z-10 flex flex-col items-center">
        {/* Title — word-stagger reveal */}
        <motion.h2
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
          className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
        >
          {TITLE.split(' ').map((word, i) => (
            <motion.span key={i} variants={FADE_IN} className="inline-block">
              {word}&nbsp;
            </motion.span>
          ))}
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={FADE_IN}
          transition={{ delay: 0.4 }}
          className="mt-5 max-w-xl text-lg text-white/70"
        >
          {DESCRIPTION}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={FADE_IN}
          transition={{ delay: 0.5 }}
        >
          <motion.a
            href="#get-started"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative mt-8 inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-8 text-base font-semibold text-[#101213] shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover"
          >
            <span className="relative z-10">Get started</span>
            <Shimmer />
          </motion.a>
        </motion.div>
      </div>

      {/* Scrolling image marquee across the lower band */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-full [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] md:h-2/5">
        <motion.div
          className="flex gap-4"
          animate={reduce ? undefined : { x: ['0%', '-50%'] }}
          transition={reduce ? undefined : { ease: 'linear', duration: 45, repeat: Infinity }}
        >
          {marquee.map((src, index) => (
            <div
              key={index}
              className="aspect-[480/779] h-56 flex-shrink-0 md:h-72"
              style={{ rotate: `${index % 2 === 0 ? -2 : 4}deg` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="Loqara chat widget design"
                loading="lazy"
                className="h-full w-full rounded-2xl border border-white/10 object-cover shadow-2xl"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
