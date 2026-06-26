import type { Metadata } from 'next'
import { CheckIcon, PhoneCallIcon, MessageSquareIcon, ArrowUpRightIcon } from 'lucide-react'
import { LandingNav } from '@/components/landing/LandingNav'
import { Footer } from '@/components/landing/sections'
import { EmailCapture } from '@/components/landing/EmailCapture'
import { PricingTable } from '@/components/landing/PricingTable'

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, honest pricing for Loqara — no setup fee, live handoff and multilingual included, and an optional voice agent. Free while in early access.',
  alternates: { canonical: '/pricing' },
}

const ADDONS = [
  {
    icon: PhoneCallIcon,
    name: 'Voice agent',
    price: '€49/mo + €0.20/min',
    desc: 'Real-time phone & in-widget voice calls powered by ElevenLabs. ~200 minutes included, then per-minute.',
  },
  {
    icon: MessageSquareIcon,
    name: 'Channels',
    price: '€19/mo each',
    desc: 'WhatsApp, Instagram & Messenger (coming soon) — connect any channel with no setup fee.',
  },
  {
    icon: ArrowUpRightIcon,
    name: 'Extra conversations',
    price: '~€15 / 1,000',
    desc: 'Busy month? Top up any plan instead of jumping a tier — or upgrade whenever you like.',
  },
]

const INCLUDED = [
  ['No setup fee', 'Self-serve and live in one line of code — no onboarding invoice.'],
  ['Live handoff included', 'Hand off to a human from a real-time inbox on every plan.'],
  ['Multilingual included', 'English + Lithuanian out of the box, more languages at no extra charge.'],
  ['Analytics included', 'Summaries, topics, CSAT and trends — not a paid upsell.'],
]

const FAQ = [
  ['Is there a setup fee?', 'No. Loqara is self-serve — paste one line of code and you’re live. No onboarding invoice, ever.'],
  ['What counts as a conversation?', 'A single back-and-forth session between a visitor and your bot, however many messages it includes. Voice calls are billed separately as minutes.'],
  ['Do voice calls cost extra?', 'Yes — the voice agent is an add-on (€49/mo including ~200 minutes, then €0.20/min), because real-time voice is the only genuinely expensive part to run.'],
  ['Can I change or cancel anytime?', 'Yes. Upgrade, downgrade, or cancel whenever — changes take effect right away.'],
  ['What if I hit my conversation limit?', 'Nothing breaks. Extra conversations are billed per 1,000, or you can move up a plan.'],
  ['Is it really free right now?', 'Yes. Loqara is free while we’re in early access — you won’t be charged until billing launches, and we’ll give plenty of notice.'],
]

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="flex-1 bg-[#101213] text-white">
        {/* Header */}
        <section className="mx-auto max-w-6xl px-5 pt-32 pb-10 text-center sm:pt-40">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            One agent, every channel — for less than a part-time hire
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            No setup fee. Handoff, languages and analytics included. Free while we’re in early access.
          </p>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-6xl px-5 pb-12">
          <PricingTable />

          {/* Enterprise banner */}
          <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:flex-row">
            <div>
              <h3 className="text-lg font-semibold">Enterprise</h3>
              <p className="mt-1 text-sm text-white/60">
                Unlimited volume, SSO, custom integrations, and a dedicated success contact.
              </p>
            </div>
            <a
              href="mailto:e.kudarauskas@gmail.com?subject=Loqara%20Enterprise"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold transition-colors hover:bg-white/10"
            >
              Talk to us
            </a>
          </div>
        </section>

        {/* Add-ons */}
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Add-ons</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-white/70">
            Bolt on the extras you need — including a voice agent most chat tools don’t offer.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {ADDONS.map((a) => {
              const Icon = a.icon
              return (
                <div key={a.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15">
                    <Icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold">{a.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{a.price}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{a.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Everything included */}
        <section className="border-y border-white/10 bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <h2 className="max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
              Everything included — nothing nickel-and-dimed
            </h2>
            <p className="mt-3 max-w-2xl text-white/70">
              Most done-for-you chat tools charge €1,500+ just to switch on, then bill live handoff and
              each channel on top. Loqara includes them, and you’re live the same afternoon.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {INCLUDED.map(([title, body]) => (
                <div key={title}>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckIcon className="size-4 text-primary" aria-hidden="true" />
                    {title}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Questions</h2>
          <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-5">
                <h3 className="font-semibold">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="start" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Start free while we’re in early access
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">
            No credit card, no setup fee. Drop your email and we’ll get you onboarded.
          </p>
          <div className="mx-auto mt-7 flex justify-center">
            <EmailCapture source="pricing" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
