'use client'

/**
 * DIRECTION CONTRACT — Landing candidate 1
 *
 * THESIS: A product-photography studio. The store's own catalogue is the lit
 * subject and the agent's answer is what the light reveals. Refuses the
 * category page: dark SaaS hero, floating chat bubble, 3×2 feature-card grid.
 * OWN-WORLD: Blackout studio ground (#0b0c0d), saturated seamless paper sweeps
 * (cobalt, magenta, amber, deep green), safety-orange gaffer tape as the only
 * accent, grey-card panels, matte-black hardware. Archivo Black slab caps for
 * display, Archivo for prose, Martian Mono for slate readouts and measurement.
 * Hard light: real shadow offsets, no halos.
 * STORY: A shop owner sees their product lit on the sweep, watches one shopper
 * question get answered from their own material with sources, learns install is
 * one line, and starts free.
 * FIRST VIEWPORT: full-bleed lit sweep; slate kicker, three-line display over a
 * raking highlight, prose at 65ch, gaffer-tape "Start free" plate lower-left,
 * mono slate strip pinned to the bottom edge.
 * FORM: product studio — candidate 5 of my 7 grounded directions, staged as a
 * blackout stage with one lit sweep. Seed key c5c2f00a (scope direction/persuade).
 */

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { useReduce } from '@/components/preview/use-reduce'
import { GetStartedDialog } from '@/components/landing/GetStartedDialog'
import { FAQ } from '@/components/landing/faq-data'
import { DISPLAY_PLANS, PLANS, POPULAR_PLAN, VOICE_ADDON, VISUALIZER_ADDON } from '@/lib/plans-catalog'

const TAPE = '#e97634'
const COBALT = '#1e46d2'
const MAGENTA = '#c8266f'
const AMBER = '#e0a32b'
const FOREST = '#1f6b4a'

// ─────────────────────────────── primitives ───────────────────────────────

/** Studio slate lettering: the one named kicker system on this surface. */
function Slate({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-mono text-[10px] leading-none tracking-[0.18em] uppercase sm:text-[11px] ${className}`}
      style={{ fontFamily: 'var(--font-studio-mono)' }}
    >
      {children}
    </span>
  )
}

/** Gaffer-taped action plate: presses into the floor on click, tape corners and all. */
function TapePlate({
  label,
  source,
  className = '',
}: {
  label: string
  source: string
  className?: string
}) {
  return (
    <span className={`relative inline-block rotate-[-1deg] ${className}`}>
      <GetStartedDialog
        source={source}
        label={label}
        triggerClassName="group relative block cursor-pointer px-9 py-4 text-[15px] font-semibold tracking-tight text-black transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-px active:translate-y-[2px] active:shadow-[0_1px_0_0_rgba(0,0,0,0.5)]"
      />
      {/* one strip of gaffer tape: ragged ends, adhesive sheen down the middle */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundColor: TAPE,
          boxShadow: '0 12px 26px -12px rgba(233,118,52,0.55)',
          clipPath:
            'polygon(0.6% 0%, 99.4% 1.5%, 100% 100%, 0% 98.5%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-px -translate-y-1/2 bg-black/12"
      />
    </span>
  )
}

// ─────────────────────────────── nav ───────────────────────────────

function StudioNav() {
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-5 pr-16 sm:px-8 sm:pr-20">
        <a href="#top" className="flex items-center gap-2.5">
          <Image src="/loqara-fox-white.webp" alt="Loqara" width={26} height={26} priority />
          <span className="text-[15px] font-semibold tracking-tight text-[#f2efe9]">Loqara</span>
        </a>
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {[
            ['Watch it answer', '#exposure'],
            ['What it does', '#gels'],
            ['Install', '#install'],
            ['Pricing', '#pricing'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-[#a8a096] transition-colors duration-150 hover:text-[#f2efe9]"
            >
              <Slate>{label}</Slate>
            </a>
          ))}
        </nav>
        <Link
          href="/login"
          className="ml-auto text-[13px] text-[#a8a096] transition-colors hover:text-[#f2efe9] md:ml-0"
        >
          Sign in
        </Link>
      </div>
    </header>
  )
}

// ─────────────────────────────── hero ───────────────────────────────

function Hero() {
  const reduce = useReduce()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // Lights-down on exit: the sweep drifts up at half speed and the blackout
  // scrim closes over it. Content itself never moves out from under the reader.
  const sweepY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const blackout = useTransform(scrollYProgress, [0, 1], [0, 0.85])

  // Haze follows the pointer like a light beam catching dust.
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const hazeX = useSpring(useTransform(px, [0, 1], [-26, 26]), { stiffness: 60, damping: 20 })
  const hazeY = useSpring(useTransform(py, [0, 1], [-16, 16]), { stiffness: 60, damping: 20 })

  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => {
      px.set(e.clientX / window.innerWidth)
      py.set(e.clientY / window.innerHeight)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [px, py, reduce])

  return (
    <section
      id="top"
      ref={ref}
      className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden"
      style={{ backgroundColor: '#0b0c0d' }}
    >
      <motion.div className="absolute inset-0 -z-20" style={{ y: reduce ? 0 : sweepY }}>
        <Image
          src="/v1/hero-sweep.webp"
          alt="A single product lit on a cobalt paper sweep in a blacked-out photography studio"
          fill
          priority
          sizes="100vw"
          className="scale-105 object-cover"
        />
      </motion.div>

      {/* haze plate — the beam catching dust, parallaxed off the pointer */}
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 hidden mix-blend-screen md:block"
        style={{ x: reduce ? 0 : hazeX, y: reduce ? 0 : hazeY, opacity: 0.5 }}
      >
        <Image src="/v1/gel-plate.webp" alt="" fill sizes="100vw" className="scale-110 object-cover" />
      </motion.div>

      {/* legibility: light falls off toward the bottom-left where the type sits */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(78deg, rgba(6,7,8,0.95) 0%, rgba(6,7,8,0.84) 32%, rgba(6,7,8,0.22) 60%, rgba(6,7,8,0.34) 100%)',
        }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[#0b0c0d]"
        style={{ opacity: reduce ? 0 : blackout }}
      />

      <StudioNav />

      <div className="relative mx-auto w-full max-w-[1400px] px-5 pt-28 pb-8 sm:px-8">
        <Slate className="text-[#e97634]">Sweep 01 — AI chat &amp; voice for online stores</Slate>

        <h1
          className="mt-7 max-w-[15ch] text-[clamp(2.6rem,8.4vw,6rem)] leading-[0.9] tracking-[-0.035em] text-[#f7f5f1] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          Lit from
          <br />
          your own
          <br />
          <span className="relative inline-block">
            catalogue
            {/* the strobe: one raking highlight passes across the word, once */}
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                initial={{ backgroundPositionX: '-140%' }}
                animate={{ backgroundPositionX: '240%' }}
                transition={{ duration: 1.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  backgroundImage:
                    'linear-gradient(96deg, transparent 38%, rgba(255,255,255,0.92) 50%, transparent 62%)',
                  backgroundSize: '260% 100%',
                  backgroundRepeat: 'no-repeat',
                  mixBlendMode: 'overlay',
                }}
              />
            )}
          </span>
        </h1>

        <p className="mt-8 max-w-[62ch] text-[17px] leading-[1.65] text-[#cfc8bf] sm:text-lg">
          Loqara answers your customers in chat and in voice — from your own content and your live
          product catalogue, with the sources it used. When someone needs a person, it hands the
          conversation to your team and steps aside.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <TapePlate label="Start free" source="v1-hero" />
          <a
            href="#exposure"
            className="group inline-flex items-center gap-2.5 text-[15px] text-[#f2efe9] transition-colors hover:text-white"
          >
            <span className="border-b border-[#a8a096]/50 pb-0.5 transition-colors group-hover:border-white">
              Watch it answer
            </span>
            <span className="transition-transform duration-200 ease-out group-hover:translate-y-0.5">
              ↓
            </span>
          </a>
        </div>
      </div>

      {/* camera slate strip along the bottom edge — readouts, not a metric band */}
      <div className="relative border-t border-white/12 bg-black/45 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-[1400px] flex-wrap gap-x-8 gap-y-2 px-5 py-3.5 pr-20 sm:px-8 sm:pr-8">
          {[
            ['Install', 'one script tag'],
            ['Languages', 'EN · LT'],
            ['Free plan', '100 conversations / mo'],
            ['Handoff', 'on every plan'],
          ].map(([k, v]) => (
            <span key={k} className="flex items-baseline gap-2">
              <Slate className="text-[#8d857b]">{k}</Slate>
              <Slate className="text-[#e3ded6]">{v}</Slate>
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── contact sheet ───────────────────────────────

const SHEET: { src: string; frame: string; caption: string; ratio: string }[] = [
  { src: '/v1/still-1.webp', frame: 'A-01', caption: 'A product, on the sweep', ratio: 'aspect-square' },
  { src: '/chatviews/chatview-2.webp', frame: 'A-02', caption: 'The same product, answered', ratio: 'aspect-[21/34]' },
  { src: '/v1/still-2.webp', frame: 'A-03', caption: 'Stock and price, read live', ratio: 'aspect-square' },
  { src: '/chatviews/chatview-5.webp', frame: 'A-04', caption: 'Order status, identity-checked', ratio: 'aspect-[21/34]' },
  { src: '/v1/still-3.webp', frame: 'A-05', caption: 'Compared, not guessed', ratio: 'aspect-square' },
  { src: '/chatviews/chatview-8.webp', frame: 'A-06', caption: 'Handed to your team', ratio: 'aspect-[21/34]' },
  { src: '/chatviews/chatview-10.webp', frame: 'A-07', caption: 'In your customer\u2019s language', ratio: 'aspect-[21/34]' },
]

function Frame({
  item,
  progress,
  i,
  reduce,
}: {
  item: (typeof SHEET)[number]
  progress: MotionValue<number>
  i: number
  reduce: boolean
}) {
  // each frame settles as it crosses the gate
  const start = i / SHEET.length
  const lift = useTransform(progress, [start - 0.14, start + 0.03], [0, 1], { clamp: true })
  const y = useTransform(lift, [0, 1], [18, 0])
  const shadow = useTransform(
    lift,
    [0, 1],
    ['0 6px 14px -10px rgba(0,0,0,0.8)', '0 30px 56px -26px rgba(0,0,0,0.95)'],
  )
  return (
    <motion.figure className="relative shrink-0" style={{ y: reduce ? 0 : y }}>
      <motion.div
        className={`relative h-[52vh] overflow-hidden bg-[#141618] sm:h-[58vh] ${item.ratio}`}
        style={{ boxShadow: shadow }}
      >
        <Image
          src={item.src}
          alt={item.caption}
          fill
          sizes="46vw"
          className="object-cover"
        />
      </motion.div>
      <figcaption className="mt-3 flex max-w-[28ch] items-baseline gap-2.5">
        <Slate className="shrink-0 text-[#e97634]">{item.frame}</Slate>
        <span className="text-[15px] text-[#cfc8bf]">{item.caption}</span>
      </figcaption>
    </motion.figure>
  )
}

function ContactSheet() {
  const reduce = useReduce()
  const ref = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [travel, setTravel] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // Measure the real strip so the scrub lands the last frame flush at every
  // viewport, instead of guessing a vw distance that only fits one width.
  useEffect(() => {
    const measure = () => {
      const el = trackRef.current
      if (!el) return
      setTravel(Math.max(0, el.scrollWidth - window.innerWidth + 48))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const x = useTransform(scrollYProgress, [0, 1], [0, -travel])

  return (
    <section className="bg-[#0b0c0d] text-[#f2efe9]">
      <div className="mx-auto max-w-[1400px] px-5 pt-28 sm:px-8">
        <Slate className="text-[#8d857b]">Contact sheet</Slate>
        <h2
          className="mt-6 max-w-[24ch] text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          One catalogue, every angle
        </h2>
        <p className="mt-6 max-w-[65ch] text-[17px] leading-[1.65] text-[#a8a096]">
          Connect WooCommerce, Shopify or Magento and the agent works the shelves for you \u2014 searching
          the live catalogue, reading price and stock as they are right now, checking an order
          against the billing email before it says a word about it.
        </p>
      </div>

      {/* the gate: vertical scroll advances the strip horizontally */}
      <div
        ref={ref}
        className="relative mt-12"
        style={reduce ? undefined : { height: travel ? `calc(100svh + ${travel}px)` : '220vh' }}
        aria-label="Product and conversation frames"
      >
        <div
          className={`flex items-center py-6 ${
            reduce ? 'overflow-x-auto' : 'sticky top-0 h-[100svh] overflow-hidden'
          }`}
        >
          <motion.div
            ref={trackRef}
            className="flex items-start gap-6 pl-5 sm:gap-8 sm:pl-8"
            style={{ x: reduce ? 0 : x }}
          >
            {SHEET.map((item, i) => (
              <Frame key={item.frame} item={item} i={i} progress={scrollYProgress} reduce={reduce} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── the exposure (focal moment) ───────────────────────────────

const SOURCES = [
  { label: 'Site page', name: 'Shipping & returns', gel: COBALT },
  { label: 'Uploaded doc', name: 'Care guide (PDF)', gel: AMBER },
  { label: 'Live catalogue', name: 'Linen towel — 2 in stock', gel: MAGENTA },
]

function SourcePlate({
  item,
  progress,
  i,
}: {
  item: (typeof SOURCES)[number]
  progress: MotionValue<number>
  i: number
}) {
  // lights come up on set, one instrument at a time
  const at = 0.16 + i * 0.16
  const on = useTransform(progress, [at, at + 0.1], [0, 1], { clamp: true })
  const borderOpacity = useTransform(on, [0, 1], [0.12, 0.85])
  const wash = useTransform(on, [0, 1], [0, 0.16])
  const x = useTransform(on, [0, 1], [0, 10])

  return (
    <motion.div className="relative overflow-hidden bg-[#141618] px-5 py-4" style={{ x }}>
      <motion.span
        aria-hidden
        className="absolute inset-0"
        style={{ backgroundColor: item.gel, opacity: wash }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: item.gel, opacity: borderOpacity }}
      />
      <div className="relative flex items-baseline justify-between gap-4">
        <span className="text-[15px] font-medium text-[#f2efe9]">{item.name}</span>
        <Slate className="text-[#a8a096]">{item.label}</Slate>
      </div>
    </motion.div>
  )
}

function Exposure() {
  const reduce = useReduce()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  // the black flag pulls off the answer once the sources are lit
  const flag = useTransform(scrollYProgress, [0.62, 0.86], ['0%', '100%'], { clamp: true })
  const flagClip = useTransform(flag, (v) => `inset(0 0 0 ${v})`)
  const keyLight = useTransform(scrollYProgress, [0.58, 0.8], [0, 0.5], { clamp: true })

  return (
    <section id="exposure" ref={ref} className="relative h-[340vh] scroll-mt-0 bg-[#0b0c0d]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1400px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.85fr_1fr] lg:items-center lg:gap-20">
          <div>
            <Slate className="text-[#8d857b]">The exposure — synthetic demo</Slate>
            <h2
              className="mt-6 max-w-[18ch] text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
              style={{ fontFamily: 'var(--font-studio-display)' }}
            >
              Nothing is invented
            </h2>
            <p className="mt-6 max-w-[60ch] text-[17px] leading-[1.65] text-[#a8a096]">
              A shopper asks. The agent lights only what it actually found in your material, then
              answers from that and shows its sources. When your content has no answer, it says so
              and offers your team instead of guessing.
            </p>
            <div className="mt-8 border-l-[1px] border-[#e97634] pl-4">
              <p className="text-[15px] leading-relaxed text-[#cfc8bf]">
                “Do you have the waffle towels in stone, and would they arrive before Friday?”
              </p>
              <Slate className="mt-2 block text-[#8d857b]">Visitor · 21:14</Slate>
            </div>
          </div>

          <div className="relative">
            <div className="space-y-3">
              {SOURCES.map((s, i) => (
                <SourcePlate key={s.name} item={s} i={i} progress={scrollYProgress} />
              ))}
            </div>

            <div className="relative mt-6">
              {/* key light spilling onto the answer plate */}
              <motion.span
                aria-hidden
                className="pointer-events-none absolute -inset-8 -z-10"
                style={{
                  opacity: reduce ? 0.4 : keyLight,
                  background: `radial-gradient(60% 70% at 30% 0%, ${TAPE}55, transparent 70%)`,
                }}
              />
              <motion.div
                className="relative bg-[#f7f5f1] px-6 py-6 text-[#111213]"
                style={{
                  clipPath: reduce ? 'inset(0 0 0 0%)' : flagClip,
                  boxShadow: '0 30px 60px -30px rgba(0,0,0,0.9)',
                }}
              >
                <Slate className="text-[#7a736a]">Loqara · answered in 1.4s</Slate>
                <p className="mt-3 text-[17px] leading-[1.6]">
                  Yes — the waffle towels in Stone are in stock, two left. Standard delivery is 1–2
                  working days, so an order placed today arrives before Friday.
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-black/10 pt-4">
                  {SOURCES.map((s) => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-1.5 bg-black/[0.06] px-2.5 py-1"
                    >
                      <span aria-hidden className="size-1.5" style={{ backgroundColor: s.gel }} />
                      <Slate className="text-[#4a453f]">{s.name}</Slate>
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
            <Slate className="mt-4 block text-[#6f6862]">
              Illustrative conversation — your own content and catalogue replace it
            </Slate>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── voice ───────────────────────────────

function Waveform() {
  const reduce = useReduce()
  const bars = 44
  return (
    <div aria-hidden className="flex h-12 items-center gap-[3px]">
      {Array.from({ length: bars }, (_, i) => {
        const base = 0.22 + Math.abs(Math.sin(i * 0.7)) * 0.78
        return (
          <motion.span
            key={i}
            className="w-[3px] origin-center"
            style={{ backgroundColor: TAPE, height: `${base * 100}%` }}
            animate={reduce ? undefined : { scaleY: [0.35, 1, 0.5, 0.85, 0.35] }}
            transition={
              reduce
                ? undefined
                : { duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: (i % 11) * 0.11 }
            }
          />
        )
      })}
    </div>
  )
}

function Voice() {
  return (
    <section className="relative isolate overflow-hidden bg-[#0b0c0d]">
      <div className="absolute inset-0 -z-10">
        <Image
          src="/v1/voice-mic.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover object-right"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(84deg, rgba(8,9,10,0.96) 0%, rgba(8,9,10,0.9) 40%, rgba(8,9,10,0.25) 100%)',
        }}
      />
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8 sm:py-36">
        <div className="max-w-[46ch]">
          <Slate className="text-[#8d857b]">Voice — add-on</Slate>
          <h2
            className="mt-6 text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
            style={{ fontFamily: 'var(--font-studio-display)' }}
          >
            Or they just talk
          </h2>
          <p className="mt-6 text-[17px] leading-[1.65] text-[#cfc8bf]">
            A real-time voice agent takes the call inside the widget: it listens, searches your
            catalogue out loud, and answers in your customer&apos;s language. The same knowledge
            base, spoken.
          </p>
          <div className="mt-8">
            <Waveform />
          </div>
          <p className="mt-8 text-[15px] text-[#a8a096]">
            €{VOICE_ADDON.monthly}/mo including ~200 minutes, then €0.20/min — priced separately
            because real-time voice is the genuinely expensive part to run.
          </p>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── gels (capabilities) ───────────────────────────────

const GELS = [
  {
    title: 'Grounded answers',
    body: 'Retrieval over your own site, docs and FAQs, with the sources it used shown in the reply.',
    gel: COBALT,
    tilt: -1.4,
    span: 'lg:col-span-5',
    tall: 'lg:pb-16',
  },
  {
    title: 'Live product search',
    body: 'Catalogue results as cards with the price and stock read at the moment of asking.',
    gel: MAGENTA,
    tilt: 0.9,
    span: 'lg:col-span-7',
    tall: 'lg:pb-10',
  },
  {
    title: 'Order lookup',
    body: 'Order status on request — released only after the order number and billing email match.',
    gel: AMBER,
    tilt: -0.6,
    span: 'lg:col-span-7',
    tall: 'lg:pb-10',
  },
  {
    title: 'Human handoff',
    body: 'Your team takes over from a live inbox, resolves, and hands the thread back to the agent.',
    gel: FOREST,
    tilt: 1.2,
    span: 'lg:col-span-5',
    tall: 'lg:pb-16',
  },
  {
    title: 'Conversation review',
    body: 'Every conversation summarised, tagged by topic, scored 1–5 with the reason it scored that.',
    gel: COBALT,
    tilt: 0.7,
    span: 'lg:col-span-6',
    tall: 'lg:pb-12',
  },
  {
    title: 'EN · LT, themed to you',
    body: 'Two languages in the box, your colours and launcher, one script tag on any platform.',
    gel: AMBER,
    tilt: -1.1,
    span: 'lg:col-span-6',
    tall: 'lg:pb-12',
  },
]

function Gels() {
  return (
    <section id="gels" className="scroll-mt-16 bg-[#101214]">
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
        <Slate className="text-[#8d857b]">Gel case</Slate>
        <h2
          className="mt-6 max-w-[22ch] text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          Six sheets in the case
        </h2>
        <p className="mt-6 max-w-[65ch] text-[17px] leading-[1.65] text-[#a8a096]">
          Each one changes what the light does. Slide any of them in front of the agent.
        </p>

        <div className="mt-14 grid gap-4 lg:grid-cols-12">
          {GELS.map((g) => (
            <motion.article
              key={g.title}
              className={`group relative overflow-hidden px-6 pt-6 pb-10 ${g.span} ${g.tall}`}
              style={{ backgroundColor: '#17191c', rotate: g.tilt }}
              whileHover={{ rotate: 0, y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* the gel: a colour field over the whole sheet, deepening as the
                  light comes through it */}
              <span
                aria-hidden
                className="absolute inset-0"
                style={{ background: `linear-gradient(142deg, ${g.gel}44 0%, ${g.gel}0f 58%, transparent 88%)` }}
              />
              <span
                aria-hidden
                className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                style={{ background: `linear-gradient(142deg, ${g.gel}b0 0%, ${g.gel}3d 62%, ${g.gel}12 100%)` }}
              />
              {/* the raking highlight that crosses the sheet as it seats */}
              <span
                aria-hidden
                className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:left-full group-hover:bg-white/12"
              />
              <div className="relative">
                <h3 className="text-[21px] font-semibold tracking-tight text-[#f7f5f1]">{g.title}</h3>
                <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-[#cfc8bf] transition-colors duration-300 group-hover:text-white">
                  {g.body}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── install ───────────────────────────────

const SNIPPET = `<script src="https://www.loqara.com/widget.js"
        data-bot-key="YOUR_BOT_KEY" async></script>`

function Install() {
  const [copied, setCopied] = useState(false)
  return (
    <section id="install" className="scroll-mt-16 bg-[#0b0c0d]">
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-20">
          <div>
            <Slate className="text-[#8d857b]">Rig it</Slate>
            <h2
              className="mt-6 max-w-[16ch] text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
              style={{ fontFamily: 'var(--font-studio-display)' }}
            >
              One line, taped down
            </h2>
            <p className="mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-[#a8a096]">
              Paste the tag once, anywhere in your site&apos;s HTML. The widget themes itself from
              your settings, so colours, launcher and language change without touching the page
              again.
            </p>
          </div>
          <div className="relative">
            <span
              aria-hidden
              className="absolute -top-3 left-8 h-7 w-24 rotate-[-4deg] opacity-80"
              style={{ backgroundColor: TAPE }}
            />
            <span
              aria-hidden
              className="absolute -bottom-3 right-10 h-7 w-20 rotate-[3deg] opacity-80"
              style={{ backgroundColor: TAPE }}
            />
            <div
              className="relative bg-[#17191c] p-6"
              style={{ boxShadow: '0 30px 60px -34px rgba(0,0,0,0.95)' }}
            >
              <pre
                className="overflow-x-auto text-[12.5px] leading-[1.8] text-[#e3ded6] sm:text-[13.5px]"
                style={{ fontFamily: 'var(--font-studio-mono)' }}
              >
                {SNIPPET}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(SNIPPET)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1800)
                }}
                className="mt-5 cursor-pointer border border-[#3a3c40] px-4 py-2 text-[#e3ded6] transition-colors duration-150 hover:border-[#e97634] hover:text-white"
              >
                <Slate>{copied ? 'Copied' : 'Copy the tag'}</Slate>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── pricing ───────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-16 bg-[#101214]">
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
        <Slate className="text-[#8d857b]">Exposure sheet</Slate>
        <h2
          className="mt-6 max-w-[20ch] text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          Pick your stop
        </h2>

        <div className="mt-14 grid gap-px bg-[#26282c] md:grid-cols-2 lg:grid-cols-4">
          {DISPLAY_PLANS.map((p) => {
            const plan = PLANS[p]
            const lit = p === POPULAR_PLAN
            return (
              <div
                key={p}
                className="group relative flex flex-col bg-[#17191c] px-6 py-7 transition-colors duration-300 hover:bg-[#1c1f22]"
              >
                {lit && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ backgroundColor: TAPE }}
                  />
                )}
                <div className="flex items-baseline justify-between">
                  <Slate className="text-[#e3ded6]">{plan.name}</Slate>
                  {lit && <Slate className="text-[#e97634]">Most picked</Slate>}
                </div>
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span
                    className="text-[40px] leading-none tracking-[-0.04em] text-[#f7f5f1]"
                    style={{ fontFamily: 'var(--font-studio-display)' }}
                  >
                    €{plan.monthly}
                  </span>
                  <span className="text-[13px] text-[#8d857b]">/mo</span>
                </div>
                <p className="mt-4 text-[14px] leading-[1.55] text-[#a8a096]">{plan.blurb}</p>
                <ul className="mt-5 space-y-2 border-t border-white/8 pt-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[14px] leading-[1.5] text-[#c4bdb4]">
                      <span aria-hidden className="mt-[7px] size-1 shrink-0 bg-[#e97634]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2">
          <Slate className="text-[#8d857b]">Add-ons</Slate>
          <Slate className="text-[#c4bdb4]">
            {VOICE_ADDON.name} €{VOICE_ADDON.monthly}/mo
          </Slate>
          <Slate className="text-[#c4bdb4]">
            {VISUALIZER_ADDON.name} €{VISUALIZER_ADDON.monthly}/mo
          </Slate>
          <Slate className="text-[#8d857b]">Annual billed at 10× — two months off</Slate>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── faq ───────────────────────────────

function SpottingList() {
  const [open, setOpen] = useState(0)
  return (
    <section className="bg-[#0b0c0d]">
      <div className="mx-auto max-w-[1400px] px-5 py-28 sm:px-8">
        <Slate className="text-[#8d857b]">Spotting list</Slate>
        <h2
          className="mt-6 text-[clamp(2rem,4.6vw,3.5rem)] leading-[0.98] tracking-[-0.03em] text-[#f7f5f1] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          Asked before
        </h2>
        <div className="mt-12 border-t border-white/12">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q} className="border-b border-white/12">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="group flex w-full cursor-pointer items-baseline gap-5 py-5 text-left"
                >
                  <Slate className="mt-1 shrink-0 text-[#6f6862]">
                    {String(i + 1).padStart(2, '0')}
                  </Slate>
                  <span className="max-w-[52ch] flex-1 text-[17px] font-medium text-[#f2efe9] transition-colors group-hover:text-white">
                    {q}
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 shrink-0 text-[#8d857b] transition-transform duration-300 ease-out"
                    style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}
                  >
                    +
                  </span>
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isOpen ? 'auto' : 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[68ch] pb-6 pl-11 text-[15.5px] leading-[1.65] text-[#a8a096]">
                    {a}
                  </p>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── close ───────────────────────────────

function Close() {
  return (
    <section className="relative isolate overflow-hidden bg-[#08090a]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[420px]"
        style={{ background: `radial-gradient(50% 60% at 50% 100%, ${COBALT}33, transparent 72%)` }}
      />
      <div className="mx-auto max-w-[1400px] px-5 py-32 text-center sm:px-8">
        <h2
          className="mx-auto max-w-[20ch] text-[clamp(2.2rem,5.6vw,4.5rem)] leading-[0.94] tracking-[-0.035em] text-[#f7f5f1] uppercase"
          style={{ fontFamily: 'var(--font-studio-display)' }}
        >
          Light it up tonight
        </h2>
        <p className="mx-auto mt-7 max-w-[54ch] text-[17px] leading-[1.65] text-[#a8a096]">
          Free plan, no card, one script tag. Bring your own content and see what it answers before
          you pay anything.
        </p>
        <div className="mt-11 flex justify-center">
          <TapePlate label="Start free" source="v1-close" />
        </div>
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-7 gap-y-2 border-t border-white/10 pt-8">
          <Slate className="text-[#6f6862]">Loqara</Slate>
          <a href="mailto:hello@loqara.com" className="text-[#8d857b] transition-colors hover:text-[#e3ded6]">
            <Slate>hello@loqara.com</Slate>
          </a>
          <Link href="/blog" className="text-[#8d857b] transition-colors hover:text-[#e3ded6]">
            <Slate>Blog</Slate>
          </Link>
          <Link href="/about" className="text-[#8d857b] transition-colors hover:text-[#e3ded6]">
            <Slate>About</Slate>
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── page ───────────────────────────────

export function StudioLanding() {
  return (
    <main
      className="bg-[#0b0c0d]"
      style={{ fontFamily: 'var(--font-studio-sans)', ['--font-mono' as string]: 'var(--font-studio-mono)' }}
    >
      <Hero />
      <ContactSheet />
      <Exposure />
      <Voice />
      <Gels />
      <Install />
      <Pricing />
      <SpottingList />
      <Close />
    </main>
  )
}
