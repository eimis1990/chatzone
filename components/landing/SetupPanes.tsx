'use client'

import Image from 'next/image'
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useReduce } from './use-reduce'

/**
 * The three setup steps as square-cornered panes with a hairline of the section's
 * own ground between them: no radius, no border, no shadow. Each step's image is
 * frosted until you reach it and then clears to daylight; hover backlights the
 * pane in that step's accent.
 */
const GLASS = '#eceeeb'

const STEPS = [
  {
    src: '/landing/how-step-1.webp',
    accent: '#12379c',
    title: 'Give it your material',
    body: 'Documents, FAQs, your site — and your store, for live products.',
  },
  {
    src: '/landing/how-step-2.webp',
    accent: '#b9761a',
    title: 'Make it yours',
    body: 'Colours, launcher, language and voice, previewed as customers see it.',
  },
  {
    src: '/landing/how-step-3.webp',
    accent: '#7c1f22',
    title: 'Paste one line',
    body: 'Your agent is answering, and your inbox is ready for handoffs.',
  },
]

function Pane({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const reduce = useReduce()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.95', 'start 0.5'] })
  const filter = useTransform(scrollYProgress, [0, 1], ['blur(12px) saturate(0.6)', 'blur(0px) saturate(1)'])
  const scale = useTransform(scrollYProgress, [0, 1], [1.05, 1])

  return (
    <div
      className="group/pane relative overflow-hidden"
      style={{ backgroundColor: GLASS }}
    >
      {/* backlight — the pane brightens, nothing moves */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 ease-out group-hover/pane:opacity-100"
        style={{ background: `radial-gradient(120% 100% at 50% 0%, ${step.accent}1f, transparent 70%)` }}
      />
      <div ref={ref} className="relative aspect-[4/3] overflow-hidden bg-[#e3e6e2]">
        <motion.div className="absolute inset-0" style={reduce ? undefined : { filter, scale }}>
          <Image
            src={step.src}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover object-top"
          />
        </motion.div>
      </div>
      <div className="px-6 py-7">
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-[10px] w-[3px]" style={{ backgroundColor: step.accent }} />
          <span className="text-[11px] leading-none tracking-[0.16em] text-[#55605c] uppercase">
            Step {index + 1}
          </span>
        </span>
        <h3 className="mt-4 text-[19px] font-medium tracking-[-0.02em] text-[#15181a]">{step.title}</h3>
        <p className="mt-2.5 max-w-[42ch] text-[15px] leading-[1.6] text-[#55605c]">{step.body}</p>
      </div>
    </div>
  )
}

export function SetupPanes() {
  return (
    <div className="grid gap-2 lg:grid-cols-3">
      {STEPS.map((step, i) => (
        <Pane key={step.title} step={step} index={i} />
      ))}
    </div>
  )
}
