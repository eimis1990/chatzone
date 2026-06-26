'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

// Add or edit Q&As here — the accordion renders whatever's in this list.
const FAQ: [string, string][] = [
  ['Is there a setup fee?', 'No. Loqara is self-serve — paste one line of code and you’re live. No onboarding invoice, ever.'],
  ['What counts as a conversation?', 'A single back-and-forth session between a visitor and your bot, however many messages it includes. Voice calls are billed separately as minutes.'],
  ['Do voice calls cost extra?', 'Yes — the voice agent is an add-on (€49/mo including ~200 minutes, then €0.20/min), because real-time voice is the only genuinely expensive part to run.'],
  ['Can I change or cancel anytime?', 'Yes. Upgrade, downgrade, or cancel whenever — changes take effect right away.'],
  ['What if I hit my conversation limit?', 'Nothing breaks. Extra conversations are billed per 1,000, or you can move up a plan.'],
  ['Which languages are supported?', 'English and Lithuanian out of the box, with more on the way — additional languages are included, not charged per language.'],
  ['Is it really free right now?', 'Yes. Loqara is free while we’re in early access — you won’t be charged until billing launches, and we’ll give plenty of notice.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto max-w-2xl text-gray-600">
            Everything about plans, limits and getting started. Can’t find your answer?{' '}
            <a href="mailto:e.kudarauskas@gmail.com" className="text-primary hover:underline">
              Email us
            </a>
            .
          </p>
        </div>

        <div className="mt-10 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <div key={q}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(isOpen ? null : i)
                    if (!isOpen) trackEvent('faq_opened', { question: q })
                  }}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[15px] font-semibold text-gray-900 transition-colors hover:bg-gray-50"
                >
                  {q}
                  <ChevronDownIcon
                    className={`size-5 flex-shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  className={`grid px-5 transition-all duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] pb-5 opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden text-sm leading-relaxed text-gray-600">{a}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
