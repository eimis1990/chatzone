import {
  CheckIcon,
  PhoneCallIcon,
  MessageSquareIcon,
  ArrowUpRightIcon,
  type LucideIcon,
} from 'lucide-react'
import { PricingTable } from './PricingTable'

const ADDONS: { icon: LucideIcon; name: string; price: string; desc: string }[] = [
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

const INCLUDED: [string, string][] = [
  ['No setup fee', 'Self-serve and live in one line of code — no onboarding invoice.'],
  ['Live handoff included', 'Hand off to a human from a real-time inbox on every plan.'],
  ['Multilingual included', 'English + Lithuanian out of the box, more languages at no extra charge.'],
  ['Analytics included', 'Summaries, topics, CSAT and trends — not a paid upsell.'],
]

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-[#101213] text-white">
      <div className="mx-auto max-w-7xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-4 text-lg text-white/70">
            No setup fee. Live handoff on every plan. Start free, upgrade as you grow.
          </p>
        </div>

        <div className="mt-12">
          <PricingTable />
        </div>

        {/* Enterprise */}
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

        {/* Add-ons */}
        <div className="mt-16">
          <h3 className="text-center text-2xl font-semibold tracking-tight">Add-ons</h3>
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
                  <h4 className="mt-4 font-semibold">{a.name}</h4>
                  <p className="mt-1 text-sm font-medium text-primary">{a.price}</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{a.desc}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Everything included */}
        <div className="mt-16 rounded-2xl border border-white/10 bg-white/[0.02] p-8">
          <h3 className="max-w-2xl text-2xl font-semibold tracking-tight">
            Everything included — nothing nickel-and-dimed
          </h3>
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
      </div>
    </section>
  )
}
