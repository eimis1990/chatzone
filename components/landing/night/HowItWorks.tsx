'use client'

import { useState, type CSSProperties } from 'react'
import { SETUP_PACKAGES, type SetupPackageId } from '@/lib/setup-packages'
import { GetStartedDialog } from '../GetStartedDialog'
import s from './night.module.css'

const NEEDS: { id: SetupPackageId; label: string }[] = [
  { id: 'essential', label: 'Questions about my business' },
  { id: 'ecommerce', label: 'Questions, products and orders' },
]

// What we build, per package: a sentence form of each package's feature list
// in lib/setup-packages.ts. Keep the two in step.
const BUILD: Record<SetupPackageId, string> = {
  essential: 'We train it on your website and your documents, and set its tone and answers.',
  ecommerce:
    'We train it on your website and documents, connect your product catalog, and set up stock answers and order tracking (WooCommerce and Magento).',
}

const BUTTON =
  'relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full px-7 text-sm font-semibold transition-colors'

/**
 * How a store goes live. Everyone starts the same way, with a free preview of
 * the assistant on their own site (the page's one offer). After that we set it
 * up for them (the lead option; the package choice changes the plan, price and
 * timing), or they do it themselves in three steps.
 */
export function HowItWorks() {
  const [need, setNeed] = useState<SetupPackageId>('essential')
  const pkg = SETUP_PACKAGES.find((p) => p.id === need) ?? SETUP_PACKAGES[0]

  const withUs = [
    {
      us: false,
      title: 'Send us your website',
      body: 'One short form. Within one working day we email you a preview of your assistant answering on your own site.',
    },
    { us: true, title: 'We build and train your assistant', body: BUILD[need] },
    {
      us: false,
      title: 'Try it and tell us what to change',
      body: 'We adjust the answers until you are happy with them.',
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
        <h2 className={s.h2}>See it on your store first. Then pick how to go live.</h2>
        <p className={`${s.sub} ${s.measure}`}>
          It starts the same way for everyone: you send us your store&rsquo;s address, and within
          one working day we email you a preview of your assistant answering on your own site,
          free. After that, we can set everything up for you, or you can do it yourself.
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
            <p className={s.wayLead}>
              Free. Your login comes with the preview, and a guided setup takes it from there.
            </p>

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
                    Colors, launcher, language and voice, previewed as your shoppers see it.
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
                    Your assistant is answering, and your inbox is ready for handoffs.
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
