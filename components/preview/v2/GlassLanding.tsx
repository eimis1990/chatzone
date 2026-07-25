'use client'

/**
 * DIRECTION CONTRACT — Landing candidate 2
 *
 * THESIS: A steel-framed glass partition wall. Every claim is one pane; the pane
 * that matters right now is the one the light is behind. Refuses the alternating
 * screenshot/paragraph ladder the current landing ships.
 * OWN-WORLD: Matte black glazing bars at true thickness (1px hairline, 8px
 * section mullions) drawn by grid gaps on ink; seeded-white glass ground
 * (#eceeeb) as the calm field; cobalt #12379c, amber #b9761a and oxblood #7c1f22
 * reserved for what matters now. Schibsted Grotesk, quiet, set inside a pane and
 * never across a bar. Hierarchy from pane size and glass colour, not type weight.
 * STORY: The visitor reads the wall left to right, sees the product's own screens
 * behind glass, finds the one pane that answers their doubt, and steps through it.
 * FIRST VIEWPORT: a squared-up elevation — one large pane holds the offer, a
 * cobalt pane holds the single hard claim, a glass pane shows the real widget;
 * the mullions glaze themselves in on load and one pane keeps its light.
 * FORM: glazier colour-field partition — dealt challenger, fused and kept because
 * an existing screenshot library wants a frame, not a card. Seed key c5c2f00a.
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
} from 'framer-motion'
import { useReduce } from '@/components/preview/use-reduce'
import { GetStartedDialog } from '@/components/landing/GetStartedDialog'
import { FAQ } from '@/components/landing/faq-data'
import { DISPLAY_PLANS, PLANS, POPULAR_PLAN, VOICE_ADDON, VISUALIZER_ADDON } from '@/lib/plans-catalog'

const INK = '#121413'
const GLASS = '#eceeeb'
const COBALT = '#12379c'
const AMBER = '#b9761a'
const OXBLOOD = '#7c1f22'
const TEXT = '#15181a'
const TEXT_DIM = '#55605c' // tinted from the glass, never neutral gray

const EASE = [0.16, 1, 0.3, 1] as const

// ─────────────────────────────── primitives ───────────────────────────────

/** Etched pane label — small, spaced, set square inside the pane. */
function Etch({
  children,
  className = '',
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <span className={`text-[11px] leading-none tracking-[0.16em] uppercase ${className}`} style={style}>
      {children}
    </span>
  )
}

/**
 * One glazed pane. `tone` assigns its glass. Rest is daylight; hover backlights;
 * `flooded` floods it with its assigned colour permanently.
 */
function Pane({
  children,
  className = '',
  tone = 'clear',
  flooded = false,
  interactive = false,
}: {
  children?: React.ReactNode
  className?: string
  tone?: 'clear' | 'cobalt' | 'amber' | 'oxblood' | 'dark'
  flooded?: boolean
  interactive?: boolean
}) {
  const fill =
    tone === 'cobalt' ? COBALT : tone === 'amber' ? AMBER : tone === 'oxblood' ? OXBLOOD : null
  const bg = flooded && fill ? fill : tone === 'dark' ? INK : GLASS
  const dark = (flooded && fill) || tone === 'dark'

  return (
    <div
      className={`relative overflow-hidden ${interactive ? 'group/pane' : ''} ${className}`}
      style={{ backgroundColor: bg, color: dark ? '#f4f5f3' : TEXT }}
    >
      {/* backlight: the pane behind the glass brightens, nothing moves */}
      {interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover/pane:opacity-100"
          style={{
            background: dark
              ? 'radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,0.22), transparent 70%)'
              : `radial-gradient(120% 100% at 50% 0%, ${fill ?? COBALT}1f, transparent 70%)`,
          }}
        />
      )}
      {/* seeded glass: the trapped-air speckle of hand-rolled sheet */}
      {!dark && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 30%, rgba(0,0,0,0.05) 0.5px, transparent 1px), radial-gradient(circle at 70% 65%, rgba(0,0,0,0.05) 0.5px, transparent 1px), radial-gradient(circle at 45% 85%, rgba(0,0,0,0.04) 0.5px, transparent 1px)',
            backgroundSize: '37px 41px, 53px 47px, 29px 31px',
          }}
        />
      )}
      <div className="relative h-full">{children}</div>
    </div>
  )
}

/** A pane whose glass frosts until it is read, then clears. Images only. */
function ClearingPane({
  src,
  alt,
  className = '',
  ratio = 'aspect-[10/7]',
  fit = 'cover',
  frost = true,
}: {
  src: string
  alt: string
  className?: string
  ratio?: string
  fit?: 'cover' | 'contain'
  /** Above-the-fold panes are already daylight; only panes you scroll to frost. */
  frost?: boolean
}) {
  const reduce = useReduce()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.42'] })
  const blur = useTransform(scrollYProgress, [0, 1], [14, 0])
  const filter = useTransform(blur, (b) => `blur(${b}px) saturate(${0.55 + (1 - b / 14) * 0.45})`)
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1])

  return (
    <div ref={ref} className={`relative overflow-hidden bg-[#e3e6e2] ${ratio} ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={reduce || !frost ? undefined : { filter, scale }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          className={fit === 'contain' ? 'object-contain' : 'object-cover object-top'}
        />
      </motion.div>
    </div>
  )
}

/** Wall CTA: the pane you step through. */
function StepThrough({
  label,
  source,
  tone = 'ink',
}: {
  label: string
  source: string
  tone?: 'ink' | 'light'
}) {
  const ink = tone === 'ink'
  return (
    <GetStartedDialog
      source={source}
      label={label}
      triggerClassName={`group/cta relative inline-flex cursor-pointer items-center px-7 py-3.5 text-[15px] font-medium tracking-tight transition-colors duration-300 ease-out ${
        ink
          ? 'bg-[#121413] text-[#f4f5f3] hover:bg-[#12379c]'
          : 'bg-[#f4f5f3] text-[#121413] hover:bg-white'
      }`}
    />
  )
}

// ─────────────────────────────── the wall grid ───────────────────────────────

/**
 * `Bay` is the wall itself: grid gaps ARE the glazing bars, so bar thickness
 * stays true at every width and bays restack to one column without redrawing.
 */
function Bay({
  children,
  className = '',
  heavy = false,
}: {
  children: React.ReactNode
  className?: string
  heavy?: boolean
}) {
  return (
    <div
      className={`grid gap-px ${className}`}
      style={{ backgroundColor: INK, padding: heavy ? 8 : 1, gap: 1 }}
    >
      {children}
    </div>
  )
}

// ─────────────────────────────── nav rail ───────────────────────────────

function Rail() {
  return (
    <header className="sticky top-0 z-30" style={{ backgroundColor: INK }}>
      <div className="mx-auto flex max-w-[1500px] items-center gap-6 px-4 py-3 pr-16 sm:px-6 sm:pr-20">
        <a href="#top" className="flex items-center gap-2.5">
          <Image src="/loqara-fox-white.webp" alt="Loqara" width={24} height={24} priority />
          <span className="text-[15px] font-semibold tracking-tight text-[#f4f5f3]">Loqara</span>
        </a>
        <nav className="ml-auto hidden items-center gap-7 md:flex">
          {[
            ['The wall', '#wall'],
            ['Setup', '#setup'],
            ['Pricing', '#pricing'],
            ['Questions', '#questions'],
          ].map(([label, href]) => (
            <a key={href} href={href} className="text-[#9aa39e] transition-colors duration-200 hover:text-white">
              <Etch>{label}</Etch>
            </a>
          ))}
        </nav>
        <Link href="/login" className="ml-auto text-[13px] text-[#9aa39e] transition-colors hover:text-white md:ml-0">
          Sign in
        </Link>
      </div>
    </header>
  )
}

// ─────────────────────────────── hero elevation ───────────────────────────────

function Hero() {
  const reduce = useReduce()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })

  // Nothing slides in this world, so the exit is light leaving the glass, not
  // the wall moving: the panes cool as the elevation goes out of view.
  const cool = useTransform(scrollYProgress, [0, 1], [1, 0.72], { clamp: true })

  // Specular reflection tracks the pointer across the whole elevation.
  const mx = useMotionValue(0.35)
  const sheen = useSpring(mx, { stiffness: 45, damping: 22 })
  const sheenPos = useTransform(sheen, (v) => `${v * 130 - 15}%`)

  useEffect(() => {
    if (reduce) return
    const onMove = (e: PointerEvent) => mx.set(e.clientX / window.innerWidth)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [mx, reduce])

  return (
    <section id="top" ref={ref} className="relative" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pt-4 pb-10 sm:px-6">
        <motion.div style={reduce ? undefined : { opacity: cool }}>
          <Bay heavy className="lg:grid-cols-12">
            {/* the offer — the largest pane */}
            <Pane className="lg:col-span-7 lg:row-span-2">
              <div className="flex h-full flex-col justify-between gap-10 px-6 py-10 sm:px-10 sm:py-12">
                <div>
                  <Etch className="text-[#6b756f]">AI chat &amp; voice for online stores</Etch>
                  <h1 className="mt-8 max-w-[19ch] text-[clamp(2.3rem,5.4vw,4.4rem)] leading-[1.02] font-medium tracking-[-0.035em] text-balance">
                    Your store, answering behind glass
                  </h1>
                  <p className="mt-7 max-w-[58ch] text-[17px] leading-[1.65]" style={{ color: TEXT_DIM }}>
                    Loqara answers customers in chat and in voice using your own content and your live
                    catalogue — with the sources it used. When a person is needed, your team takes the
                    conversation over from a live inbox.
                  </p>
                </div>
                <div className="flex flex-col gap-4 border-t pt-7" style={{ borderColor: 'rgba(18,20,19,0.14)' }}>
                  {[
                    ['Chat', 'grounded in your own content, with sources'],
                    ['Voice', 'a real-time call inside the same widget'],
                    ['Commerce', 'live product search and identity-checked orders'],
                  ].map(([k, v]) => (
                    <span key={k} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Etch className="w-[86px] shrink-0" style={{ color: TEXT_DIM }}>
                        {k}
                      </Etch>
                      <span className="text-[15px]" style={{ color: '#2c3330' }}>
                        {v}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-7 gap-y-4">
                  <StepThrough label="Start free" source="v2-hero" />
                  <a
                    href="#wall"
                    className="group inline-flex items-center gap-2 text-[15px]"
                    style={{ color: TEXT }}
                  >
                    <span className="border-b pb-0.5 transition-colors" style={{ borderColor: '#b7bfba' }}>
                      Read the wall
                    </span>
                    <span className="transition-transform duration-300 ease-out group-hover:translate-y-0.5">↓</span>
                  </a>
                </div>
              </div>
            </Pane>

            {/* the one hard claim, flooded cobalt */}
            <Pane tone="cobalt" flooded interactive className="lg:col-span-5">
              <div className="flex h-full flex-col justify-between gap-8 px-6 py-9 sm:px-8">
                <Etch className="text-white/60">The claim</Etch>
                <p className="max-w-[26ch] text-[clamp(1.35rem,2.1vw,1.85rem)] leading-[1.22] font-medium tracking-[-0.02em]">
                  It answers from your material, or it says it doesn&apos;t know and fetches a human.
                </p>
                <Etch className="text-white/60">No invented policies · No made-up prices</Etch>
              </div>
            </Pane>

            {/* real product glass */}
            <Pane className="lg:col-span-5">
              <ClearingPane
                src="/landing/feature-chat.webp"
                alt="Loqara knowledge base screen listing the sources the agent answers from"
                ratio="aspect-[10/7] lg:aspect-auto lg:h-full"
                frost={false}
              />
            </Pane>
          </Bay>

          {/* the reading strip: four facts, four small panes */}
          <Bay className="mt-2 grid-cols-2 lg:grid-cols-4" heavy>
            {[
              ['Install', 'One script tag'],
              ['Languages', 'English · Lithuanian'],
              ['Free plan', '100 conversations / mo'],
              ['Human handoff', 'On every plan'],
            ].map(([k, v]) => (
              <Pane key={k} interactive>
                <div className="px-5 py-6">
                  <Etch style={{ color: TEXT_DIM }}>{k}</Etch>
                  <div className="mt-3 text-[16px] font-medium tracking-tight">{v}</div>
                </div>
              </Pane>
            ))}
          </Bay>
        </motion.div>
      </div>

      {/* the sheen across the whole elevation */}
      {!reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(104deg, transparent 40%, rgba(255,255,255,0.5) 50%, transparent 60%)',
            backgroundSize: '220% 100%',
            backgroundRepeat: 'no-repeat',
            backgroundPositionX: sheenPos,
          }}
        />
      )}
    </section>
  )
}

// ─────────────────────────────── the feature wall ───────────────────────────────

const WALL: {
  eyebrow: string
  title: string
  body: string
  src: string
  alt: string
  tone: 'clear' | 'cobalt' | 'amber' | 'oxblood'
  flood: boolean
  wide: boolean
}[] = [
  {
    eyebrow: 'Grounded chat',
    title: 'Answers from your knowledge, with the sources shown',
    body: 'Upload documents, point it at your site, add FAQ pairs. It answers from that material and cites what it used — and when the answer is not there, it offers your team instead of guessing.',
    src: '/landing/feature-chat.webp',
    alt: 'Loqara knowledge base screen listing indexed sources from a store’s own site and documents',
    tone: 'cobalt',
    flood: true,
    wide: true,
  },
  {
    eyebrow: 'Commerce',
    title: 'Searches the live catalogue, checks the order',
    body: 'Connect WooCommerce, Shopify or Magento: product cards with the price and stock as they are right now, order status released only after the order number and billing email match.',
    src: '/landing/feature-commerce.webp',
    alt: 'Loqara chat widget showing live product cards with prices in response to a product question',
    tone: 'amber',
    flood: false,
    wide: false,
  },
  {
    eyebrow: 'Voice',
    title: 'Or the customer just talks',
    body: `A real-time voice agent answers spoken questions inside the widget and speaks results aloud, in the customer's language. €${VOICE_ADDON.monthly}/mo add-on with ~200 minutes.`,
    src: '/landing/feature-voice.webp',
    alt: 'Loqara widget during a live voice call, answering a spoken customer question',
    tone: 'oxblood',
    flood: true,
    wide: false,
  },
  {
    eyebrow: 'Handoff',
    title: 'Your team steps in, then steps back out',
    body: 'Escalations land in a live inbox. Take the conversation over, resolve it, hand it back to the agent — the visitor never restarts and never repeats themselves.',
    src: '/landing/feature-handoff.webp',
    alt: 'Loqara agent inbox with an escalated conversation open and take-over controls',
    tone: 'clear',
    flood: false,
    wide: true,
  },
  {
    eyebrow: 'Review',
    title: 'Every conversation summarised and scored',
    body: 'Topics tagged, quality rated 1–5 with the reason, CSAT and fallback rate rolled up into trends — so you can see what customers keep asking and what the agent keeps missing.',
    src: '/landing/feature-analytics.webp',
    alt: 'Loqara analytics dashboard with conversation volume trends, CSAT and AI success score',
    tone: 'cobalt',
    flood: false,
    wide: false,
  },
  {
    eyebrow: 'Fit',
    title: 'Themed to your site, live in one line',
    body: 'Colours, fonts and launcher shape to match your brand, English and Lithuanian in the box, one script tag on any platform. Preview it exactly as customers will see it.',
    src: '/landing/feature-widget.webp',
    alt: 'Loqara widget configurator with theme presets beside a live branded preview',
    tone: 'amber',
    flood: true,
    wide: false,
  },
]

function WallRow({ item, index }: { item: (typeof WALL)[number]; index: number }) {
  const textFirst = index % 2 === 1
  const accent =
    item.tone === 'cobalt' ? COBALT : item.tone === 'amber' ? AMBER : item.tone === 'oxblood' ? OXBLOOD : INK
  const lit = item.flood

  return (
    <Bay className={item.wide ? 'lg:grid-cols-12' : 'lg:grid-cols-2'} heavy>
      <Pane
        interactive
        tone={item.tone}
        flooded={lit}
        className={`${item.wide ? 'lg:col-span-5' : ''} ${textFirst ? '' : 'lg:order-2'}`}
      >
        <div className="flex h-full flex-col justify-center gap-6 px-6 py-10 sm:px-9 sm:py-12">
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className="h-[10px] w-[3px]"
              style={{ backgroundColor: lit ? 'rgba(255,255,255,0.7)' : accent }}
            />
            <Etch style={{ color: lit ? 'rgba(255,255,255,0.72)' : TEXT_DIM }}>{item.eyebrow}</Etch>
          </span>
          <h3 className="max-w-[24ch] text-[clamp(1.6rem,2.6vw,2.3rem)] leading-[1.12] font-medium tracking-[-0.028em]">
            {item.title}
          </h3>
          <p
            className="max-w-[62ch] text-[16px] leading-[1.68]"
            style={{ color: lit ? 'rgba(255,255,255,0.88)' : TEXT_DIM }}
          >
            {item.body}
          </p>
        </div>
      </Pane>
      <Pane className={`${item.wide ? 'lg:col-span-7' : ''} ${textFirst ? '' : 'lg:order-1'}`}>
        <ClearingPane src={item.src} alt={item.alt} ratio="aspect-[10/7] lg:aspect-auto lg:h-full" />
      </Pane>
    </Bay>
  )
}

function FeatureWall() {
  return (
    <section id="wall" className="scroll-mt-14" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
        <Bay heavy className="lg:grid-cols-12">
          <Pane className="lg:col-span-8">
            <div className="px-6 py-14 sm:px-10 sm:py-16">
              <Etch style={{ color: TEXT_DIM }}>Elevation — read left to right</Etch>
              <h2 className="mt-8 max-w-[26ch] text-[clamp(2rem,4vw,3.2rem)] leading-[1.04] font-medium tracking-[-0.032em]">
                One agent, six panes of it
              </h2>
              <p className="mt-6 max-w-[64ch] text-[17px] leading-[1.65]" style={{ color: TEXT_DIM }}>
                Every pane below is a real screen from the product.
              </p>
            </div>
          </Pane>
          {/* the material itself: hand-rolled seeded glass in its black frame */}
          <Pane tone="dark" className="lg:col-span-4">
            <div className="relative h-full min-h-[180px]">
              <Image
                src="/v2/glass-plate.webp"
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1024px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
          </Pane>
        </Bay>
        <div className="mt-2 space-y-2">
          {WALL.map((item, i) => (
            <WallRow key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─────────────────────────────── subpane carousel ───────────────────────────────

const VIEWS = [0, 3, 4, 6, 7, 9].map((n) => `/chatviews/chatview-${n}.webp`)
const VIEW_TONES: ('cobalt' | 'amber' | 'oxblood')[] = ['cobalt', 'amber', 'oxblood']

function Carousel() {
  const [i, setI] = useState(0)
  const reduce = useReduce()

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI((v) => (v + 1) % VIEWS.length), 3600)
    return () => clearInterval(id)
  }, [reduce])

  const tone = VIEW_TONES[i % VIEW_TONES.length]
  const fill = tone === 'cobalt' ? COBALT : tone === 'amber' ? AMBER : OXBLOOD

  return (
    <section style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
        <Bay heavy className="lg:grid-cols-12">
          <Pane className="lg:col-span-4">
            <div className="flex h-full flex-col justify-between gap-8 px-6 py-10 sm:px-8">
              <div>
                <Etch style={{ color: TEXT_DIM }}>Subpanes</Etch>
                <h2 className="mt-7 max-w-[18ch] text-[clamp(1.7rem,2.7vw,2.4rem)] leading-[1.1] font-medium tracking-[-0.03em]">
                  The same wall, in your customer&apos;s words
                </h2>
                <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.65]" style={{ color: TEXT_DIM }}>
                  Product questions, delivery questions, order checks, a handoff — all inside the
                  widget on your own site.
                </p>
              </div>
              {/* the mullion index: hold a subpane by picking it */}
              <div className="flex gap-1" role="tablist" aria-label="Conversation views">
                {VIEWS.map((v, n) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={n === i}
                    aria-label={`View ${n + 1}`}
                    onClick={() => setI(n)}
                    className="h-8 flex-1 cursor-pointer transition-colors duration-500 ease-out"
                    style={{ backgroundColor: n === i ? fill : '#d3d8d3' }}
                  />
                ))}
              </div>
            </div>
          </Pane>
          <Pane tone="dark" className="lg:col-span-8">
            <div className="relative aspect-[16/10] w-full">
              {VIEWS.map((v, n) => (
                <motion.div
                  key={v}
                  className="absolute inset-0"
                  initial={false}
                  animate={{ opacity: n === i ? 1 : 0 }}
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <Image
                    src={v}
                    alt=""
                    aria-hidden={n !== i}
                    fill
                    sizes="(min-width: 1024px) 66vw, 100vw"
                    className="object-contain p-4 sm:p-8"
                  />
                </motion.div>
              ))}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-colors duration-700"
                style={{ backgroundColor: `${fill}14` }}
              />
            </div>
          </Pane>
        </Bay>
      </div>
    </section>
  )
}

// ─────────────────────────────── setup bay ───────────────────────────────

const STEPS = [
  {
    src: '/landing/how-step-1.webp',
    title: 'Give it your material',
    body: 'Documents, FAQs, your site — and your store, for live products.',
  },
  {
    src: '/landing/how-step-2.webp',
    title: 'Glaze it to your brand',
    body: 'Colours, launcher, language and voice, previewed as customers see it.',
  },
  {
    src: '/landing/how-step-3.webp',
    title: 'Fit the pane',
    body: 'Paste one script tag. It is answering, and your inbox is watching.',
  },
]

function Setup() {
  return (
    <section id="setup" className="scroll-mt-14" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
        <Bay heavy className="lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <Pane key={s.title} interactive>
              <ClearingPane src={s.src} alt="" ratio="aspect-[16/10]" />
              <div className="px-6 py-7">
                <span className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-[10px] w-[3px]"
                    style={{ backgroundColor: [COBALT, AMBER, OXBLOOD][i] }}
                  />
                  <Etch style={{ color: TEXT_DIM }}>Step {i + 1}</Etch>
                </span>
                <h3 className="mt-4 text-[19px] font-medium tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-2.5 max-w-[42ch] text-[15px] leading-[1.6]" style={{ color: TEXT_DIM }}>
                  {s.body}
                </p>
              </div>
            </Pane>
          ))}
        </Bay>
      </div>
    </section>
  )
}

// ─────────────────────────────── pricing bay ───────────────────────────────

function PricingWall() {
  return (
    <section id="pricing" className="scroll-mt-14" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
        <Bay heavy>
          <Pane>
            <div className="px-6 py-14 sm:px-10">
              <Etch style={{ color: TEXT_DIM }}>Openings</Etch>
              <h2 className="mt-7 max-w-[22ch] text-[clamp(2rem,3.6vw,3rem)] leading-[1.06] font-medium tracking-[-0.032em]">
                Pick the pane you need
              </h2>
            </div>
          </Pane>
        </Bay>

        <Bay heavy className="mt-2 md:grid-cols-2 lg:grid-cols-4">
          {DISPLAY_PLANS.map((p) => {
            const plan = PLANS[p]
            const lit = p === POPULAR_PLAN
            return (
              <Pane key={p} interactive tone={lit ? 'cobalt' : 'clear'} flooded={lit}>
                <div className="flex h-full flex-col px-6 py-8">
                  <div className="flex items-baseline justify-between gap-3">
                    <Etch style={lit ? { color: 'rgba(255,255,255,0.75)' } : { color: TEXT_DIM }}>
                      {plan.name}
                    </Etch>
                    {lit && <Etch className="text-white/75">Most picked</Etch>}
                  </div>
                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-[42px] leading-none font-medium tracking-[-0.04em]">
                      €{plan.monthly}
                    </span>
                    <span className="text-[13px]" style={lit ? { color: 'rgba(255,255,255,0.7)' } : { color: TEXT_DIM }}>
                      /mo
                    </span>
                  </div>
                  <p
                    className="mt-5 text-[14.5px] leading-[1.55]"
                    style={lit ? { color: 'rgba(255,255,255,0.86)' } : { color: TEXT_DIM }}
                  >
                    {plan.blurb}
                  </p>
                  <ul
                    className="mt-6 space-y-2.5 border-t pt-6"
                    style={{ borderColor: lit ? 'rgba(255,255,255,0.22)' : 'rgba(18,20,19,0.12)' }}
                  >
                    {plan.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-[14.5px] leading-[1.5]">
                        <span
                          aria-hidden
                          className="mt-[7px] size-1 shrink-0"
                          style={{ backgroundColor: lit ? 'rgba(255,255,255,0.8)' : COBALT }}
                        />
                        <span style={lit ? undefined : { color: '#2c3330' }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Pane>
            )
          })}
        </Bay>

        <Bay heavy className="mt-2 grid-cols-1 sm:grid-cols-3">
          {[
            [`${VOICE_ADDON.name} add-on`, `€${VOICE_ADDON.monthly}/mo · ~200 min included`],
            [`${VISUALIZER_ADDON.name} add-on`, `€${VISUALIZER_ADDON.monthly}/mo`],
            ['Annual billing', 'Billed at 10× — two months off'],
          ].map(([k, v]) => (
            <Pane key={k} interactive>
              <div className="px-5 py-5">
                <Etch style={{ color: TEXT_DIM }}>{k}</Etch>
                <div className="mt-2.5 text-[15px]">{v}</div>
              </div>
            </Pane>
          ))}
        </Bay>
      </div>
    </section>
  )
}

// ─────────────────────────────── questions ───────────────────────────────

function Questions() {
  const [open, setOpen] = useState(0)
  return (
    <section id="questions" className="scroll-mt-14" style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-3 sm:px-6">
        <Bay heavy>
          <Pane>
            <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6 px-6 py-12 sm:px-10">
              <div>
                <Etch style={{ color: TEXT_DIM }}>Frosted until asked</Etch>
                <h2 className="mt-7 max-w-[24ch] text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.08] font-medium tracking-[-0.03em]">
                  Questions people ask first
                </h2>
              </div>
              <p className="max-w-[34ch] text-[15.5px] leading-[1.6]" style={{ color: TEXT_DIM }}>
                Still unanswered?{' '}
                <a href="mailto:hello@loqara.com" className="underline decoration-1 underline-offset-2">
                  hello@loqara.com
                </a>
              </p>
            </div>
          </Pane>
        </Bay>
        <Bay heavy className="mt-2">
          <Pane>
            <div className="px-2 py-2 sm:px-6 sm:py-4">
              {FAQ.map(([q, a], i) => {
                const isOpen = open === i
                return (
                  <div
                    key={q}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'rgba(18,20,19,0.12)' }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? -1 : i)}
                      aria-expanded={isOpen}
                      className="flex w-full cursor-pointer items-baseline gap-4 px-4 py-4 text-left transition-colors duration-300 hover:bg-black/[0.03]"
                    >
                      <span
                        aria-hidden
                        className="mt-1.5 h-[10px] w-[3px] shrink-0 transition-colors duration-300"
                        style={{ backgroundColor: isOpen ? COBALT : '#c2c9c4' }}
                      />
                      <span className="flex-1 text-[16.5px] font-medium tracking-[-0.015em]">{q}</span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0 }}
                      transition={{ duration: 0.34, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p
                        className="max-w-[70ch] px-4 pb-5 pl-11 text-[15.5px] leading-[1.68]"
                        style={{ color: TEXT_DIM }}
                      >
                        {a}
                      </p>
                    </motion.div>
                  </div>
                )
              })}
            </div>
          </Pane>
        </Bay>
      </div>
    </section>
  )
}

// ─────────────────────────────── close ───────────────────────────────

function Close() {
  return (
    <section style={{ backgroundColor: INK }}>
      <div className="mx-auto max-w-[1500px] px-4 pb-4 sm:px-6">
        <Bay heavy className="lg:grid-cols-12">
          <Pane tone="oxblood" flooded interactive className="lg:col-span-8">
            <div className="flex h-full flex-col justify-between gap-10 px-6 py-14 sm:px-10 sm:py-16">
              <h2 className="max-w-[22ch] text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.04] font-medium tracking-[-0.034em]">
                Put it on your site tonight
              </h2>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <StepThrough label="Start free" source="v2-close" tone="light" />
                <p className="text-[15px] text-white/70">
                  Free plan, no card, one script tag.
                </p>
              </div>
            </div>
          </Pane>
          <Pane className="lg:col-span-4">
            <div className="flex h-full flex-col justify-between gap-8 px-6 py-10">
              <Image src="/loqara-fox-black.webp" alt="Loqara" width={28} height={28} />
              <div className="flex flex-col gap-2.5">
                {[
                  ['hello@loqara.com', 'mailto:hello@loqara.com'],
                  ['Blog', '/blog'],
                  ['About', '/about'],
                  ['Sign in', '/login'],
                ].map(([label, href]) =>
                  href.startsWith('mailto:') ? (
                    <a key={href} href={href} className="transition-colors duration-200" style={{ color: TEXT_DIM }}>
                      <Etch>{label}</Etch>
                    </a>
                  ) : (
                    <Link key={href} href={href} className="transition-colors duration-200" style={{ color: TEXT_DIM }}>
                      <Etch>{label}</Etch>
                    </Link>
                  ),
                )}
              </div>
            </div>
          </Pane>
        </Bay>
      </div>
    </section>
  )
}

// ─────────────────────────────── page ───────────────────────────────

export function GlassLanding() {
  return (
    <main style={{ backgroundColor: INK, fontFamily: 'var(--font-glass-sans)', color: TEXT }}>
      <Rail />
      <Hero />
      <FeatureWall />
      <Carousel />
      <Setup />
      <PricingWall />
      <Questions />
      <Close />
    </main>
  )
}
