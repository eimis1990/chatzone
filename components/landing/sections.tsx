import {
  type LucideIcon,
  BrainIcon,
  PhoneCallIcon,
  HeadsetIcon,
  BarChart3Icon,
  ShoppingBagIcon,
  LanguagesIcon,
} from 'lucide-react'
import Image from 'next/image'
import { Reveal, RevealSlide } from './Reveal'
import { FeatureSpine, FeatureText } from './ScrollRevealText'
import { GetStartedDialog } from './GetStartedDialog'
import { FlickeringGrid } from '@/components/magicui/flickering-grid'
import { SetupPanes } from './SetupPanes'

// Brand accent for inline styles — resolves to the --primary CSS variable so
// the whole landing follows a single source of truth (see app/globals.css).
const ACCENT = 'var(--primary)'
const DARK = '#101213'

// ───────────────────────── Feature rows ─────────────────────────
interface Feature {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  icon: LucideIcon
  imageSrc: string
  imageAlt: string
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'GROUNDED AI CHAT',
    title: 'Answers from your knowledge, not guesses',
    body: 'Upload docs, FAQs, or your site and the agent answers only from what it knows — with sources. No hallucinated policies, no made-up prices.',
    bullets: ['Retrieval over your own content', 'Cites the sources it used', 'Graceful fallback + lead capture when unsure'],
    icon: BrainIcon,
    imageSrc: '/landing/feature-chat.webp',
    imageAlt: 'Loqara Knowledge Base screen with indexed sources — site pages, FAQs, and AI answer summaries the agent draws on',
  },
  {
    eyebrow: 'VOICE AGENT',
    title: 'Customers can just talk to your store',
    body: 'A real-time voice agent answers spoken questions, searches products out loud, and speaks your customer’s language — right inside the widget.',
    bullets: ['Live voice calls in the widget', 'Per-language voices', 'Speaks product results aloud'],
    icon: PhoneCallIcon,
    imageSrc: '/landing/feature-voice.webp',
    imageAlt: 'Loqara widget during a live voice call — the assistant listens and answers the customer’s spoken question in chat',
  },
  {
    eyebrow: 'LIVE HANDOFF',
    title: 'Hand off to a human in one tap',
    body: 'When a customer needs a person, the bot steps aside and your team takes over from a real-time inbox — then hands back when it’s done.',
    bullets: ['Agent inbox with live updates', 'Take over, resolve, or return to bot', 'Auto-escalation when the bot is stuck'],
    icon: HeadsetIcon,
    imageSrc: '/landing/feature-handoff.webp',
    imageAlt: 'Loqara agent inbox with an escalated conversation open and the Take over and Return to bot controls',
  },
  {
    eyebrow: 'ANALYTICS & EVALUATIONS',
    title: 'See what customers care about — and how you did',
    body: 'Every conversation is summarized, tagged with topics, scored for quality, and rolled up into trends so you can improve fast.',
    bullets: ['Per-conversation summaries + topics', 'AI success rating (1–5) with reasons', 'CSAT, fallback rate, trending topics'],
    icon: BarChart3Icon,
    imageSrc: '/landing/feature-analytics.webp',
    imageAlt: 'Loqara analytics dashboard with conversation and message-volume trends, CSAT, AI success score and handoff stats',
  },
  {
    eyebrow: 'COMMERCE SKILLS',
    title: 'Find products, check orders, share deals',
    body: 'Connect WooCommerce or Shopify and the agent searches your catalog, looks up order status (verified by email), and offers discount codes.',
    bullets: ['Live product search with cards', 'Order status — identity-checked', 'Discount codes on request'],
    icon: ShoppingBagIcon,
    imageSrc: '/landing/feature-commerce.webp',
    imageAlt: 'Loqara chat widget showing live product cards with prices in response to a product question',
  },
  {
    eyebrow: 'MULTILINGUAL & EMBEDDABLE',
    title: 'English, Lithuanian, and live in one line',
    body: 'Match your brand, pick your launcher, and paste a single script tag. The widget themes itself and speaks your customers’ language.',
    bullets: ['EN + LT out of the box', 'Themeable launcher (circle or pill)', 'One-line install on any site'],
    icon: LanguagesIcon,
    imageSrc: '/landing/feature-widget.webp',
    imageAlt: 'Loqara widget configurator with theme presets next to a live branded preview of the chat widget',
  },
]

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const reversed = index % 2 === 1
  const num = String(index + 1).padStart(2, '0')
  return (
    <section className="grid border-t border-gray-200 bg-white text-gray-900 lg:grid-cols-2">
      {/* Visual half: locked to the screenshots' own 10:7 ratio (1200×840), so the
          image fills its half exactly — no letterbox bands — and the row height
          scales proportionally with the viewport. Drifts in from its outer edge. */}
      <div
        className={`relative aspect-[10/7] overflow-hidden bg-[#f9f9f9] ${reversed ? 'lg:order-2' : ''}`}
      >
        <RevealSlide className="absolute inset-0">
          <Image
            src={feature.imageSrc}
            alt={feature.imageAlt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        </RevealSlide>
      </div>
      <div
        className={`flex items-center justify-center px-5 py-14 sm:px-10 lg:px-16 lg:py-16 ${
          reversed ? 'lg:order-1' : ''
        }`}
      >
        <div className="w-full max-w-xl">
          <FeatureText number={num} title={feature.title} body={feature.body} accent={ACCENT} />
        </div>
      </div>
    </section>
  )
}

export function Features() {
  return (
    <div id="features" className="scroll-mt-20">
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-5 pt-24 pb-20 text-center">
          <Reveal>
            <h2 className="text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">
              One agent. Every part of support.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From the first question to the final order, Loqara handles it — and brings in your
              team exactly when it matters.
            </p>
          </Reveal>
        </div>
      </section>
      <FeatureSpine>
        <div className="border-b border-gray-200">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.title} feature={f} index={i} />
          ))}
        </div>
      </FeatureSpine>
    </div>
  )
}

// ───────────────────────── Stats band ─────────────────────────
export function Stats() {
  const stats = [
    { value: '24/7', label: 'Always-on answers' },
    { value: '<2s', label: 'Typical first reply' },
    { value: 'EN · LT', label: 'Languages in the box' },
    { value: '1 line', label: 'To install anywhere' },
  ]
  return (
    <section style={{ backgroundColor: DARK }} className="relative isolate overflow-hidden text-white">
      <FlickeringGrid
        className="absolute inset-0 -z-10 size-full"
        squareSize={4}
        gridGap={6}
        color="#e97634"
        maxOpacity={0.18}
        flickerChance={0.1}
      />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal
            key={s.label}
            className={`border-white/10 px-6 py-12 text-center ${
              i === 0 ? '' : i % 2 === 0 ? 'md:border-l' : 'border-l'
            }`}
          >
            <div className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{s.value}</div>
            <div className="mt-2 text-sm text-white/55">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ───────────────────────── How it works ─────────────────────────
export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 bg-[#f6f8f6]">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">Live in an afternoon</h2>
          <p className="mt-4 text-lg text-gray-600">No engineers required — set it up, preview it, ship it.</p>
        </Reveal>
        <div className="mt-14">
          <SetupPanes />
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── Big CTA band ─────────────────────────

/**
 * Real widget conversations around the CTA's edges — solid cards, all one size,
 * gently tilted (nothing past 6°): one per corner, plus a mid-edge sliver each
 * side at xl that tucks behind its corner cards. They bleed off the panel so
 * only fragments show, and the corner cards never overlap one another. Hand-
 * placed (never random) and verified to stay clear of the centre column where
 * the heading, copy and button live, at every width.
 *
 * Corner-only by design — below `lg` the panel is barely wider than its own
 * text, so there is no margin to scatter into and the group is dropped.
 */
const SCATTER = [
  // mid-edge slivers first, so the corner cards paint over them (deck order)
  { src: '/chatviews/chatview-10.webp', className: 'top-1/2 -left-40 hidden -translate-y-1/2 rotate-2 xl:block' },
  { src: '/chatviews/chatview-6.webp', className: 'top-1/2 -right-40 hidden -translate-y-1/2 -rotate-2 xl:block' },
  // one card per corner
  { src: '/chatviews/chatview-1.webp', className: '-top-24 -left-20 -rotate-6' },
  { src: '/chatviews/chatview-4.webp', className: '-bottom-32 -left-2 rotate-3 xl:left-24' },
  { src: '/chatviews/chatview-7.webp', className: '-top-24 -right-20 rotate-6' },
  { src: '/chatviews/chatview-9.webp', className: '-right-2 -bottom-32 -rotate-3 xl:right-24' },
]


function ScatteredViews() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
      {SCATTER.map((v) => (
        <div
          key={v.src}
          className={`absolute w-[200px] overflow-hidden rounded-xl border border-white/15 ${v.className}`}
          // Solid, just toned: dimmed and slightly desaturated so nine other
          // brands' widget colours sit behind the CTA instead of against it.
          style={{ filter: 'saturate(0.8) brightness(0.82)', boxShadow: '0 28px 56px -20px rgba(0,0,0,0.85)' }}
        >
          <Image src={v.src} alt="" width={420} height={680} sizes="230px" className="h-auto w-full" />
        </div>
      ))}
      {/* a tight pool of the panel's own dark under the copy — gone before it
          reaches the cards, so they stay solid while the centre stays clean */}
      <span
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(44% 58% at 50% 50%, rgba(16,18,19,0.92) 0%, rgba(16,18,19,0.55) 52%, rgba(16,18,19,0) 74%)',
        }}
      />
    </div>
  )
}

export function CTASection() {
  // No `id="get-started"` on this section: links pointing at `#get-started`
  // (blog CTAs, links in chat replies) must OPEN the signup dialog, not scroll
  // to this band. The dialog below owns that hash via `openOnHash`.
  return (
    <section className="text-white" style={{ backgroundColor: DARK }}>
      <div className="mx-auto max-w-7xl px-5 py-24">
        <Reveal>
          {/* Framed as its own contained panel so the closing CTA reads as a card
              rather than a flat dark band. `overflow-hidden` is what crops the
              scattered conversations at the panel's edges. */}
          <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:px-10">
            <ScatteredViews />
            <h2 className="relative mx-auto max-w-xl text-balance text-5xl font-light tracking-tight sm:text-6xl">
              Add an AI agent to your site today
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Free to start and live in one line of code. Set it up this afternoon, and your
              customers feel the difference tonight.
            </p>
            <div className="relative mt-8 flex flex-col items-center gap-3">
              <GetStartedDialog
                source="cta"
                shimmer
                openOnHash="#get-started"
                triggerClassName="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-10 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover sm:h-14 sm:px-12 sm:text-base"
              />
              <p className="text-sm text-white/50">No credit card needed — we reach out within a day.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
