'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { FAQ } from './faq-data'

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <div className="space-y-2 text-center">
          <h2 className="text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">
            Frequently asked questions
          </h2>
          <p className="mx-auto max-w-2xl text-gray-600">
            Everything about plans, limits and getting started. Can’t find your answer?{' '}
            <a href="mailto:hello@loqara.com" className="text-primary hover:underline">
              Email us
            </a>
            .
          </p>
        </div>

        <div className="mt-10 divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white">
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
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-gray-900 transition-colors hover:bg-gray-50"
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
