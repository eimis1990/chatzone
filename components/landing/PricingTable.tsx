'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from 'lucide-react'

type Plan = {
  name: string
  monthly: number
  conversations: string
  blurb: string
  features: string[]
  popular?: boolean
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    monthly: 0,
    conversations: '100 conversations / mo',
    blurb: 'Try Loqara on your store.',
    features: ['1 bot', 'English + Lithuanian', 'Live handoff to your team', 'Lead capture', 'Basic analytics'],
  },
  {
    name: 'Starter',
    monthly: 149,
    conversations: '1,500 conversations / mo',
    blurb: 'For growing stores.',
    features: ['Everything in Free', 'All languages', 'Product search & order lookup', 'Full analytics + CSAT', 'Remove Loqara badge'],
    popular: true,
  },
  {
    name: 'Growth',
    monthly: 249,
    conversations: '4,000 conversations / mo',
    blurb: 'For busy teams.',
    features: ['Everything in Starter', 'Multiple bots', 'Priority support', 'Domain allowlist', 'Advanced analytics'],
  },
  {
    name: 'Scale',
    monthly: 449,
    conversations: '12,000 conversations / mo',
    blurb: 'High-volume support.',
    features: ['Everything in Growth', 'Teams & roles', 'Custom data retention', 'Priority SLA'],
  },
]

export function PricingTable() {
  const [annual, setAnnual] = useState(true)
  const perMonth = (m: number) => (annual ? Math.round((m * 10) / 12) : m)

  return (
    <div>
      {/* Billing period toggle */}
      <div className="mb-10 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${!annual ? 'bg-white text-[#101213]' : 'text-white/70 hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${annual ? 'bg-white text-[#101213]' : 'text-white/70 hover:text-white'}`}
          >
            Annual <span className="text-primary">· save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              p.popular ? 'border-primary bg-primary/[0.06] ring-1 ring-primary' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-[#101213]">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-white/60">{p.blurb}</p>

            <div className="mt-5 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">€{perMonth(p.monthly)}</span>
              {p.monthly > 0 && <span className="text-sm text-white/60">/mo</span>}
            </div>
            <p className="mt-1 h-4 text-xs text-white/45">
              {p.monthly > 0 && annual ? `billed annually · €${p.monthly * 10}/yr` : ' '}
            </p>

            <p className="mt-4 text-sm font-medium text-primary">{p.conversations}</p>

            <Link
              href="#get-started"
              className={`mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors ${
                p.popular
                  ? 'bg-primary text-[#101213] hover:bg-primary-hover'
                  : 'border border-white/15 text-white hover:bg-white/10'
              }`}
            >
              {p.monthly === 0 ? 'Start free' : 'Get started'}
            </Link>

            <ul className="mt-6 space-y-2.5 text-sm text-white/75">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon className="mt-0.5 size-4 flex-shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
