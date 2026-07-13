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
import Link from 'next/link'
import { Reveal, RevealSlide } from './Reveal'
import { FeatureSpine, FeatureText } from './ScrollRevealText'
import { GetStartedDialog } from './GetStartedDialog'
import { FlickeringGrid } from '@/components/magicui/flickering-grid'

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
    imageAlt: 'Loqara chat widget answering a return-policy question with an answer grounded in the store’s own knowledge base',
  },
  {
    eyebrow: 'VOICE AGENT',
    title: 'Customers can just talk to your store',
    body: 'A real-time voice agent answers spoken questions, searches products out loud, and speaks your customer’s language — right inside the widget.',
    bullets: ['Live voice calls in the widget', 'Per-language voices', 'Speaks product results aloud'],
    icon: PhoneCallIcon,
    imageSrc: '/landing/feature-voice.webp',
    imageAlt: 'Live voice call in the Loqara widget showing the Listening state while a customer talks to the store',
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
    imageAlt: 'Loqara analytics dashboard with conversation trends, CSAT, AI success score, top questions and top products',
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
      {/* Visual half: spans hairline to hairline; the 4:3 shot letterboxes inside
          (object-contain) so nothing is cropped, and drifts in from its outer edge */}
      <div
        className={`relative aspect-[4/3] overflow-hidden lg:aspect-auto ${reversed ? 'lg:order-2' : ''}`}
        style={{ backgroundImage: 'linear-gradient(135deg, #fdeee2, #f7d3b5)' }}
      >
        <RevealSlide from={reversed ? 'right' : 'left'} className="absolute inset-0">
          <Image
            src={feature.imageSrc}
            alt={feature.imageAlt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-contain"
          />
        </RevealSlide>
      </div>
      <div
        className={`flex items-center justify-center px-5 py-14 sm:px-10 lg:px-16 lg:py-28 ${
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
    <div id="features">
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
            delay={i * 0.08}
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
  const steps = [
    { image: '/landing/how-step-1.webp', title: 'Connect your knowledge', body: 'Add docs, FAQs, or your site, and link WooCommerce or Shopify for live products.' },
    { image: '/landing/how-step-2.webp', title: 'Customize the widget', body: 'Pick colors, fonts, launcher, and voice. Preview it exactly as customers will see it.' },
    { image: '/landing/how-step-3.webp', title: 'Embed and go live', body: 'Paste one script tag. Your agent is answering — and your inbox is ready for handoffs.' },
  ]
  return (
    <section id="how" className="bg-[#f6f8f6]">
      <div className="mx-auto max-w-7xl px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">Live in an afternoon</h2>
          <p className="mt-4 text-lg text-gray-600">No engineers required — set it up, preview it, ship it.</p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.1}>
              <div className="group h-full overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-md">
                <div className="bg-[#faf8f5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt=""
                    aria-hidden="true"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="p-6 pt-5">
                  <div className="text-sm font-semibold" style={{ color: ACCENT }}>
                    Step {i + 1}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── Big CTA band ─────────────────────────
export function CTASection() {
  // No `id="get-started"` on this section: links pointing at `#get-started`
  // (blog CTAs, links in chat replies) must OPEN the signup dialog, not scroll
  // to this band. The dialog below owns that hash via `openOnHash`.
  return (
    <section className="text-white" style={{ backgroundColor: DARK }}>
      <div className="mx-auto max-w-7xl px-5 py-24">
        <Reveal>
          {/* Framed as its own contained panel so the closing CTA reads as a card
              rather than a flat dark band. */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-16 text-center sm:px-10">
            <h2 className="mx-auto max-w-xl text-balance text-5xl font-light tracking-tight sm:text-6xl">
              Add an AI agent to your site today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Free to start and live in one line of code. Set it up this afternoon, and your
              customers feel the difference tonight.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
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

// ───────────────────────── Footer ─────────────────────────
export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden text-white" style={{ backgroundColor: DARK }}>
      {/* Faint grid, same as the logged-in app shell */}
      <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-full" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-5 pb-12 pt-20 text-center">
        {/* Oversized brand wordmark */}
        <div
          className="font-semibold leading-none tracking-tight"
          style={{ fontSize: 'clamp(3rem, 12vw, 10rem)' }}
        >
          Loqara<span style={{ color: ACCENT }}>.</span>
        </div>
        <p className="mx-auto mt-6 max-w-md text-balance text-base text-white/55">
          The AI chat &amp; voice agent for modern stores. Answers, leads, orders, and handoff — in one widget.
        </p>

        {/* Bottom bar (no divider — the footer grid already separates it) */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-white/45">
          <span>© {2026} Loqara. All rights reserved.</span>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/blog" className="transition-colors hover:text-white">
            Blog
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/privacy" className="transition-colors hover:text-white">
            Privacy
          </Link>
          <span aria-hidden="true" className="text-base font-bold text-white/30">
            •
          </span>
          <Link href="/terms" className="transition-colors hover:text-white">
            Terms of use
          </Link>
        </div>
      </div>
    </footer>
  )
}
