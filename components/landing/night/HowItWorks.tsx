'use client'

import { useState, type CSSProperties } from 'react'
import { SETUP_PACKAGES, type SetupPackageId } from '@/lib/setup-packages'
import { GetStartedDialog } from '../GetStartedDialog'
import s from './night.module.css'

const NEEDS: { id: SetupPackageId; label: string }[] = [
  { id: 'essential', label: 'Questions about my business' },
  { id: 'ecommerce', label: 'Questions, products and orders' },
]

// What the team builds, per package: a sentence form of each package's
// feature list in lib/setup-packages.ts. Keep the two in step.
const BUILD: Record<SetupPackageId, string> = {
  essential:
    'We train it on your website and your documents, and set its persona and answers.',
  ecommerce:
    'We train it on your website and documents, connect your product catalogue, and set up stock answers and order tracking (WooCommerce and Magento).',
}

const BUTTON =
  'relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-semibold transition-colors'

/**
 * How a store goes live: we do it for them (the lead option, with the two
 * done-for-you packages as a choice that changes the plan, price and timing),
 * or they do it themselves in three steps, free.
 */
export function HowItWorks() {
  const [need, setNeed] = useState<SetupPackageId>('essential')
  const pkg = SETUP_PACKAGES.find((p) => p.id === need) ?? SETUP_PACKAGES[0]

  const withUs = [
    { us: false, title: 'Send us your website', body: 'One short form. We reach out within a day.' },
    { us: true, title: 'We build and train your agent', body: BUILD[need] },
    {
      us: false,
      title: 'Try it and tell us what to change',
      body: 'We show it answering on a preview of your own site, then fine-tune it.',
    },
    { us: true, title: 'We install it on your site', body: `${pkg.timeline}.` },
  ]

  return (
    <section
      id="how"
      className={s.day}
      data-clock="780"
      data-tone="day"
      style={{ '--paper': '#f6f8f6' } as CSSProperties}
    >
      <div className={s.stepsWrap}>
        <h2 className={s.h2}>Live in an afternoon, or leave it to us</h2>
        <p className={`${s.sub} max-w-3xl`}>
          Setting Loqara up yourself is free and takes three steps. If you would rather not touch
          it, our team builds, trains and installs your agent for a one-time fee.
        </p>

        <div className={s.ways}>
          <div className={`${s.way} ${s.wayUs}`}>
            <h3 className={s.wayTitle}>We set it up for you</h3>
            <p className={s.wayLead}>You send us your website. We do the rest.</p>

            <div className={s.need}>
              <span id="how-need">What should it handle?</span>
              <div className={s.seg} role="group" aria-labelledby="how-need">
                {NEEDS.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    aria-pressed={n.id === need}
                    onClick={() => setNeed(n.id)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>

            <ol className={s.path}>
              {withUs.map((step) => (
                <li key={step.title} className={s.pathStep}>
                  <span className={s.by} data-us={step.us ? '' : undefined}>
                    {step.us ? 'Loqara' : 'You'}
                  </span>
                  <div>
                    <p className={s.pathTitle}>{step.title}</p>
                    <p className={s.pathBody}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className={s.wayFoot}>
              <p className={s.priceBig}>€{pkg.price.toLocaleString('en-US')}</p>
              <p className={s.priceNote}>
                One-time, {pkg.name} package.
                <br />
                <a href="#setup" className="underline underline-offset-2 hover:text-white">
                  See what each package includes
                </a>
              </p>
              <GetStartedDialog
                source="setup"
                label="Request setup"
                shimmer
                triggerClassName={`${BUTTON} ml-auto bg-primary text-white hover:bg-primary-hover`}
              />
            </div>
          </div>

          <div className={`${s.way} ${s.waySelf}`}>
            <h3 className={s.wayTitle}>Set it up yourself</h3>
            <p className={s.wayLead}>Free, with a guided setup. No engineers required.</p>

            <ol className={s.path}>
              <li className={s.pathStep}>
                <span className={s.num} aria-hidden="true">
                  1
                </span>
                <div>
                  <p className={s.pathTitle}>Give it your material</p>
                  <p className={s.pathBody}>
                    Documents, FAQs, your site, and your store for live products.
                  </p>
                </div>
              </li>
              <li className={s.pathStep}>
                <span className={s.num} aria-hidden="true">
                  2
                </span>
                <div>
                  <p className={s.pathTitle}>Make it yours</p>
                  <p className={s.pathBody}>
                    Colours, launcher, language and voice, previewed as customers see it.
                  </p>
                </div>
              </li>
              <li className={s.pathStep}>
                <span className={s.num} aria-hidden="true">
                  3
                </span>
                <div>
                  <p className={s.pathTitle}>Paste one line</p>
                  <p className={s.pathBody}>
                    Your agent is answering, and your inbox is ready for handoffs.
                  </p>
                  <p className={s.artCode} aria-hidden="true">
                    {'<script\n  src="https://www.loqara.com/widget.js"\n  '}
                    <b>data-bot-key</b>
                    {'="your-key"\n></script>'}
                  </p>
                </div>
              </li>
            </ol>

            <div className={s.wayFoot}>
              <p className={s.priceBig}>€0</p>
              <p className={s.priceNote}>
                To set up.
                <br />
                Plans start free.
              </p>
              <GetStartedDialog
                source="how"
                triggerClassName={`${BUTTON} ml-auto bg-[#14182b] text-white hover:bg-black`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
