import {
  type LucideIcon,
  BrainIcon,
  PhoneCallIcon,
  HeadsetIcon,
  BarChart3Icon,
  ShoppingBagIcon,
  LanguagesIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Reveal } from './Reveal'
import { FeatureText } from './ScrollRevealText'
import { EmailCapture } from './EmailCapture'
import { FlickeringGrid } from '@/components/magicui/flickering-grid'

// Brand accent for inline styles — resolves to the --primary CSS variable so
// the whole landing follows a single source of truth (see app/globals.css).
const ACCENT = 'var(--primary)'
const DARK = '#101213'

// ───────────────────────── Trusted-by strip ─────────────────────────
export function Logos() {
  const names = ['Aromama', 'Nordbaltic', 'ACTION!', 'Klaipėda Goods', 'Baltic Skincare']
  return (
    <section className="border-b bg-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <Reveal>
          <p className="text-center text-sm text-gray-500">Built for modern e-commerce and service teams</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-60">
            {names.map((n) => (
              <span key={n} className="text-lg font-semibold tracking-tight text-gray-400">
                {n}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

// ───────────────────────── Feature rows ─────────────────────────
interface Feature {
  eyebrow: string
  title: string
  body: string
  bullets: string[]
  icon: LucideIcon
  imageSrc: string
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'GROUNDED AI CHAT',
    title: 'Answers from your knowledge, not guesses',
    body: 'Upload docs, FAQs, or your site and the agent answers only from what it knows — with sources. No hallucinated policies, no made-up prices.',
    bullets: ['Retrieval over your own content', 'Cites the sources it used', 'Graceful fallback + lead capture when unsure'],
    icon: BrainIcon,
    imageSrc: '/landing/feature-chat.png',
  },
  {
    eyebrow: 'VOICE AGENT',
    title: 'Customers can just talk to your store',
    body: 'A real-time voice agent answers spoken questions, searches products out loud, and speaks your customer’s language — right inside the widget.',
    bullets: ['Live voice calls in the widget', 'Per-language voices', 'Speaks product results aloud'],
    icon: PhoneCallIcon,
    imageSrc: '/landing/feature-voice.png',
  },
  {
    eyebrow: 'LIVE HANDOFF',
    title: 'Hand off to a human in one tap',
    body: 'When a customer needs a person, the bot steps aside and your team takes over from a real-time inbox — then hands back when it’s done.',
    bullets: ['Agent inbox with live updates', 'Take over, resolve, or return to bot', 'Auto-escalation when the bot is stuck'],
    icon: HeadsetIcon,
    imageSrc: '/landing/feature-handoff.png',
  },
  {
    eyebrow: 'ANALYTICS & EVALUATIONS',
    title: 'See what customers care about — and how you did',
    body: 'Every conversation is summarized, tagged with topics, scored for quality, and rolled up into trends so you can improve fast.',
    bullets: ['Per-conversation summaries + topics', 'AI success rating (1–5) with reasons', 'CSAT, fallback rate, trending topics'],
    icon: BarChart3Icon,
    imageSrc: '/landing/feature-analytics.png',
  },
  {
    eyebrow: 'COMMERCE SKILLS',
    title: 'Find products, check orders, share deals',
    body: 'Connect WooCommerce or Shopify and the agent searches your catalog, looks up order status (verified by email), and offers discount codes.',
    bullets: ['Live product search with cards', 'Order status — identity-checked', 'Discount codes on request'],
    icon: ShoppingBagIcon,
    imageSrc: '/landing/feature-commerce.png',
  },
  {
    eyebrow: 'MULTILINGUAL & EMBEDDABLE',
    title: 'English, Lithuanian, and live in one line',
    body: 'Match your brand, pick your launcher, and paste a single script tag. The widget themes itself and speaks your customers’ language.',
    bullets: ['EN + LT out of the box', 'Themeable launcher (circle or pill)', 'One-line install on any site'],
    icon: LanguagesIcon,
    imageSrc: '/landing/feature-widget.png',
  },
]

function FeatureVisual({ icon: Icon, imageSrc, dark }: { icon: LucideIcon; imageSrc: string; dark?: boolean }) {
  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/5"
      style={{
        backgroundColor: dark ? '#0f1f16' : '#eef5f0',
        backgroundImage: `url(${imageSrc}), linear-gradient(135deg, #dcebe1, #b9d9c4)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-xl bg-white/90 shadow">
        <Icon className="size-6" style={{ color: ACCENT }} />
      </div>
    </div>
  )
}

function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  const reversed = index % 2 === 1
  const Icon = feature.icon
  const num = String(index + 1).padStart(2, '0')
  return (
    <section className="bg-white text-gray-900">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <Reveal className={reversed ? 'lg:order-2' : ''}>
          <FeatureVisual icon={Icon} imageSrc={feature.imageSrc} dark={false} />
        </Reveal>
        <div className={reversed ? 'lg:order-1' : ''}>
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
        <div className="mx-auto max-w-3xl px-5 pt-24 pb-4 text-center">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              One agent. Every part of support.
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From the first question to the final order, Loqara handles it — and brings in your
              team exactly when it matters.
            </p>
          </Reveal>
        </div>
      </section>
      {FEATURES.map((f, i) => (
        <FeatureRow key={f.title} feature={f} index={i} />
      ))}
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
      <div className="relative mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
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
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Live in an afternoon</h2>
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
  return (
    <section id="get-started" className="scroll-mt-20 text-white" style={{ backgroundColor: DARK }}>
      <div className="mx-auto max-w-3xl px-5 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Put an AI agent on your store today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Free to get started. Set it up in an afternoon and let your customers feel the difference tonight.
          </p>
          <div className="mx-auto mt-8 flex justify-center">
            <EmailCapture source="cta" />
          </div>
          <p className="mt-4 text-xs text-white/55">No credit card required.</p>
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
      <div className="mx-auto max-w-6xl px-5 pb-12 pt-20 text-center">
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
