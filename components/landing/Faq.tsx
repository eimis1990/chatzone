'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { FAQ } from './faq-data'

/**
 * Two-column FAQ: the intro and illustration on the left, every question on the
 * right, both scrolling with the page.
 *
 * The LEFT column sets the height — title, copy and a square illustration — and
 * the question panel stretches to meet it, distributing the leftover space across
 * its rows rather than leaving a gap under the last one. So the two columns end on
 * the same line in every state, at any width, with no magic numbers: change the
 * question count or the image and it still lines up.
 *
 * The illustration is displayed square rather than at its source 3:4 because a
 * 3:4 frame here is ~640px tall, which made the left column taller than eleven
 * questions could ever fill.
 *
 * An inner scrollbar was rejected outright (it hides most of the list behind a
 * gesture nobody discovers, and nests scrolling inside a scrolling page), and a
 * sticky left column was tried and removed: with the heights matched its travel
 * is zero, so all it could do is release awkwardly.
 *
 * The illustration is desktop-only: stacked on a phone it would sit between the
 * intro and the questions, pushing the actual content below the fold.
 */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-16">
          <div>
            <h2 className="text-5xl font-light tracking-tight text-gray-900 sm:text-6xl">
              Frequently asked questions
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-gray-600">
              Everything about plans, limits and getting started. Can’t find your answer?{' '}
              <a href="mailto:hello@loqara.com" className="text-primary hover:underline">
                Email us
              </a>
              .
            </p>
            <div className="mt-9 hidden overflow-hidden rounded-2xl border border-gray-200/80 lg:block">
              <Image
                src="/landing/faq-illustration.webp"
                alt=""
                aria-hidden="true"
                width={900}
                height={900}
                sizes="(min-width: 1024px) 482px, 0px"
                className="aspect-square w-full object-cover"
              />
            </div>
          </div>

          {/* One panel, not eleven cards. It stretches to the grid row (i.e. the
              left column's height) and each row is `flex: 1 1 auto` — natural
              height plus an equal share of whatever is left over. Collapsed, the
              rows breathe to fill the panel; open one and the others give the
              space back. The two columns therefore end on the same line without
              anything being hardcoded. */}
          <div className="flex flex-col divide-y divide-gray-200 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {FAQ.map(([q, a], i) => {
              const isOpen = open === i
              return (
                <div
                  key={q}
                  className={`flex flex-auto flex-col justify-center transition-colors duration-200 ${
                    isOpen ? 'bg-[#fdf8f4]' : 'hover:bg-gray-50/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(isOpen ? null : i)
                      if (!isOpen) trackEvent('faq_opened', { question: q })
                    }}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-3 text-left text-[16px] font-semibold text-gray-900 sm:px-6"
                  >
                    {q}
                    <ChevronDownIcon
                      className={`size-5 flex-shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180 text-primary' : 'text-gray-400'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    className={`grid px-5 transition-all duration-300 ease-out sm:px-6 ${
                      isOpen ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden text-[14.5px] leading-relaxed text-gray-600">{a}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
