'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { FAQ_GROUPS } from './faq-data'
import night from './night/night.module.css'

/**
 * Two-column FAQ in the page's evening: the intro on the left, the questions on
 * the right in two titled panels (trust first, then money). Answers stay in the
 * DOM while closed, collapsed with a grid row, so they are in the server HTML.
 *
 * An inner scrollbar was rejected outright (it hides most of the list behind a
 * gesture nobody discovers, and nests scrolling inside a scrolling page).
 */
export function Faq() {
  const [open, setOpen] = useState<string | null>(FAQ_GROUPS[0].items[0][0])

  return (
    <section
      id="faq"
      className="scroll-mt-16 bg-[#0b0f24] text-white"
      data-clock="1350"
      data-tone="night"
    >
      <div className="mx-auto max-w-7xl px-5 py-20 sm:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16">
          <div>
            <h2 className={night.h2}>Frequently asked questions</h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
              The questions store owners ask before they hand over their customers, and the
              practical ones after. Something else?{' '}
              <a href="mailto:hello@loqara.com" className="text-primary hover:underline">
                Email us
              </a>
              .
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {FAQ_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="mb-3 text-sm font-semibold text-white/70">{group.title}</h3>
                <div className="flex flex-col divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {group.items.map(([q, a]) => {
                    const isOpen = open === q
                    return (
                      <div
                        key={q}
                        className={`transition-colors duration-200 ${
                          isOpen ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpen(isOpen ? null : q)
                            if (!isOpen) trackEvent('faq_opened', { question: q })
                          }}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[16px] font-semibold sm:px-6"
                        >
                          {q}
                          <ChevronDownIcon
                            className={`size-5 flex-shrink-0 transition-transform duration-300 ${
                              isOpen ? 'rotate-180 text-primary' : 'text-white/40'
                            }`}
                            aria-hidden="true"
                          />
                        </button>
                        <div
                          className={`grid px-5 transition-all duration-300 ease-out sm:px-6 ${
                            isOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden text-[15px] leading-relaxed text-white/75">
                            {a}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
