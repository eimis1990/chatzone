'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckIcon } from 'lucide-react'
import { Shimmer } from './Shimmer'
import { trackEvent } from '@/lib/analytics'
import { PLANS, DISPLAY_PLANS, POPULAR_PLAN } from '@/lib/plans-catalog'

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
            onClick={() => {
              setAnnual(false)
              trackEvent('pricing_billing_toggled', { period: 'monthly' })
            }}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${!annual ? 'bg-white text-[#101213]' : 'text-white/70 hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => {
              setAnnual(true)
              trackEvent('pricing_billing_toggled', { period: 'annual' })
            }}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${annual ? 'bg-white text-[#101213]' : 'text-white/70 hover:text-white'}`}
          >
            Annual <span className="text-primary">· save ~17%</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {DISPLAY_PLANS.map((key) => {
          const p = PLANS[key]
          const popular = key === POPULAR_PLAN
          return (
          <div
            key={key}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              popular ? 'border-primary bg-primary/[0.06] ring-1 ring-primary' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            {popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
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
              {p.monthly > 0 ? (annual ? `billed annually · €${p.monthly * 10}/yr` : 'billed monthly') : ' '}
            </p>

            <p className="mt-4 text-sm font-medium text-primary">
              {p.conversations.toLocaleString()} conversations / mo
            </p>

            <Link
              href="#get-started"
              onClick={() =>
                trackEvent('pricing_plan_click', {
                  plan: p.name,
                  period: annual ? 'annual' : 'monthly',
                  price: perMonth(p.monthly),
                })
              }
              className={`relative mt-5 inline-flex h-11 items-center justify-center overflow-hidden rounded-full px-5 text-sm font-semibold transition-colors ${
                popular
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'border border-white/15 text-white hover:bg-white/10'
              }`}
            >
              <span className="relative z-10">{p.monthly === 0 ? 'Start free' : 'Get started'}</span>
              {popular && <Shimmer />}
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
          )
        })}
      </div>
    </div>
  )
}
