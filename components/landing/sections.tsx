import {
  type LucideIcon,
  CheckIcon,
  BrainIcon,
  PhoneCallIcon,
  HeadsetIcon,
  BarChart3Icon,
  ShoppingBagIcon,
  LanguagesIcon,
  PlugIcon,
  SlidersHorizontalIcon,
  RocketIcon,
  BotIcon,
} from 'lucide-react'
import Link from 'next/link'
import { Reveal } from './Reveal'

const ACCENT = '#68A369'
const DARK = '#13241b'

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
  const dark = index % 2 === 1
  const reversed = index % 2 === 1
  const Icon = feature.icon
  return (
    <section style={dark ? { backgroundColor: DARK } : undefined} className={dark ? 'text-white' : 'bg-white text-gray-900'}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:py-28">
        <Reveal className={reversed ? 'lg:order-2' : ''}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
            style={dark ? { backgroundColor: 'rgba(255,255,255,0.1)', color: '#a9d6b4' } : { backgroundColor: 'rgba(104,163,105,0.12)', color: '#3f6b48' }}
          >
            <Icon className="size-3.5" /> {feature.eyebrow}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{feature.title}</h2>
          <p className={`mt-4 text-lg leading-relaxed ${dark ? 'text-white/75' : 'text-gray-600'}`}>{feature.body}</p>
          <ul className="mt-6 space-y-2.5">
            {feature.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <CheckIcon className="mt-0.5 size-5 flex-shrink-0" style={{ color: dark ? '#7cc08a' : ACCENT }} />
                <span className={dark ? 'text-white/80' : 'text-gray-700'}>{b}</span>
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.1} className={reversed ? 'lg:order-1' : ''}>
          <FeatureVisual icon={Icon} imageSrc={feature.imageSrc} dark={dark} />
        </Reveal>
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
              From the first question to the final order, Chatzone handles it — and brings in your
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
    <section style={{ backgroundColor: DARK }} className="text-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-16 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.08} className="text-center">
            <div className="text-4xl font-semibold tracking-tight" style={{ color: '#7cc08a' }}>
              {s.value}
            </div>
            <div className="mt-2 text-sm text-white/70">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

// ───────────────────────── How it works ─────────────────────────
export function HowItWorks() {
  const steps = [
    { icon: PlugIcon, title: 'Connect your knowledge', body: 'Add docs, FAQs, or your site, and link WooCommerce or Shopify for live products.' },
    { icon: SlidersHorizontalIcon, title: 'Customize the widget', body: 'Pick colors, fonts, launcher, and voice. Preview it exactly as customers will see it.' },
    { icon: RocketIcon, title: 'Embed and go live', body: 'Paste one script tag. Your agent is answering — and your inbox is ready for handoffs.' },
  ]
  return (
    <section id="how" className="bg-[#f6f8f6]">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">Live in an afternoon</h2>
          <p className="mt-4 text-lg text-gray-600">No engineers required — set it up, preview it, ship it.</p>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.title} delay={i * 0.1}>
                <div className="h-full rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex size-11 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(104,163,105,0.12)' }}>
                    <Icon className="size-6" style={{ color: ACCENT }} />
                  </div>
                  <div className="mt-4 text-sm font-semibold" style={{ color: ACCENT }}>
                    Step {i + 1}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ───────────────────────── Big CTA band ─────────────────────────
export function CTASection() {
  return (
    <section id="pricing" className="relative overflow-hidden text-white" style={{ backgroundColor: DARK }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-20 -top-20 size-[26rem] rounded-full bg-[#68A369]/25 blur-[120px]" />
        <div className="absolute bottom-0 left-0 size-[22rem] rounded-full bg-[#2f6b44]/30 blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Put an AI agent on your store today
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">
            Free while we&apos;re in early access. Set it up in an afternoon and let your customers feel the
            difference tonight.
          </p>
          <form action="/login" className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              name="email"
              placeholder="Enter your work email"
              className="h-12 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-sm text-white placeholder:text-white/50 outline-none focus:border-[#68A369] focus:ring-2 focus:ring-[#68A369]/40"
            />
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#68A369] px-6 text-sm font-semibold text-white shadow-lg shadow-[#68A369]/20 transition-colors hover:bg-[#5a9159]"
            >
              Get started
            </Link>
          </form>
          <p className="mt-4 text-xs text-white/55">No credit card required.</p>
        </Reveal>
      </div>
    </section>
  )
}

// ───────────────────────── Footer ─────────────────────────
export function Footer() {
  const cols = [
    { title: 'Product', links: [['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']] },
    { title: 'Company', links: [['Sign in', '/login'], ['Privacy', '/privacy']] },
  ] as const
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <BotIcon className="size-5" style={{ color: ACCENT }} />
            Chatzone
          </div>
          <p className="mt-3 max-w-xs text-sm text-gray-500">
            The AI chat &amp; voice agent for modern stores. Answers, leads, orders, and handoff — in one widget.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold text-gray-900">{c.title}</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-500">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-gray-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-gray-400">
          © {2026} Chatzone. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
