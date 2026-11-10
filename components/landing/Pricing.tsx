import {
  PhoneCallIcon,
  MessageSquareIcon,
  ArrowUpRightIcon,
  SofaIcon,
  type LucideIcon,
} from 'lucide-react'
import { PricingTable } from './PricingTable'
import night from './night/night.module.css'

const ADDONS: { icon: LucideIcon; name: string; price: string; desc: string }[] = [
  {
    icon: PhoneCallIcon,
    name: 'Voice agent',
    price: '€49/mo + €0.20/min',
    desc: 'Real-time phone & in-widget voice calls powered by ElevenLabs. ~200 minutes included, then per-minute.',
  },
  {
    icon: SofaIcon,
    name: 'Product visualizer',
    price: '€29/mo',
    desc: 'Let shoppers see your furniture in their own room, rendered by AI.',
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


export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-16 bg-[#0b0f24] text-white"
      data-clock="1110"
      data-tone="night"
    >
      <div className="mx-auto max-w-7xl px-5 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className={night.h2}>Simple, honest pricing</h2>
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
            href="mailto:hello@loqara.com?subject=Loqara%20Enterprise"
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
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>
    </section>
  )
}
