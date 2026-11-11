'use client'

import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { Scene, at } from './Scene'
import s from './night.module.css'

type Lang = 'en' | 'lt'

// Order labels mirror the real widget's OrderStatusCard, so the scene shows
// what a shopper actually sees.
const COPY = {
  en: {
    ask: 'Hi! Where is my order #10482?',
    reply: 'Hello! Let me check. Which email did you order with?',
    match: 'Order number and email match',
    order: 'Order #10482',
    status: 'Shipped',
    items: [
      ['Oslo cushion set × 2', '€99.90'],
      ['Care kit × 1', '€49.00'],
    ],
    total: ['Total', '€148.90'],
    track: ['Ordered', 'Processing', 'Shipped', 'Delivered'],
  },
  lt: {
    ask: 'Labas! Kur mano užsakymas #10482?',
    reply: 'Sveiki! Tuoj patikrinsiu. Kokiu el. paštu užsakėte?',
    match: 'Užsakymo numeris ir el. paštas sutampa',
    order: 'Užsakymas #10482',
    status: 'Išsiųstas',
    items: [
      ['Oslo pagalvėlių rinkinys × 2', '99,90 €'],
      ['Priežiūros rinkinys × 1', '49,00 €'],
    ],
    total: ['Iš viso', '148,90 €'],
    track: ['Užsakyta', 'Vykdomas', 'Išsiųstas', 'Pristatyta'],
  },
} as const

// The page is in English, so the conversation is too; Lithuanian is one click
// away, as it is for a shopper in the widget.
const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'lt', label: 'Lithuanian' },
]

/** 3:12 AM — verified order status, in either of the assistant's languages. */
export function SceneOrder() {
  const [lang, setLang] = useState<Lang>('en')
  const c = COPY[lang]

  return (
    <Scene
      id="features"
      minutes={192}
      when="3:12 AM"
      sky="linear-gradient(180deg, #05060f 0%, #0a0e27 9%, #11163a 55%, #1b1c4d 100%)"
      title={<>Greta can&rsquo;t sleep. She wants to know where her order is.</>}
      body={
        <>
          Loqara asks which email she ordered with, and shows the order only when the number and
          the email match.
        </>
      }
      gain={<>You wake up to one less &ldquo;where is my order?&rdquo; message.</>}
      fine={<>Order lookup is part of Starter and up, on WooCommerce and Magento stores.</>}
      aside={
        <div className={s.lang}>
          <span id="scene-order-lang">Your shoppers can have it in</span>
          <div className={s.seg} role="group" aria-labelledby="scene-order-lang">
            {LANGS.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={l.id === lang}
                onClick={() => setLang(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <div className={s.talk} lang={lang}>
        <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(3, 11)}>
          {c.ask}
        </p>
        <p className={`${s.step} ${s.bubble} ${s.fromAgent}`} style={at(17, 25)}>
          {c.reply}
        </p>
        <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(31, 39)}>
          greta@example.com
        </p>
        <p className={`${s.step} ${s.verify}`} style={at(46, 55)}>
          <span className={s.tick}>
            <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
          {c.match}
        </p>
        <div className={`${s.step} ${s.order}`} style={at(62, 72)} data-testid="order-card">
          <p className={s.orderHead}>
            {c.order}
            <span className={s.pill}>{c.status}</span>
          </p>
          <ul className={s.items}>
            {c.items.map(([name, price]) => (
              <li key={name}>
                <span>{name}</span>
                <span>{price}</span>
              </li>
            ))}
          </ul>
          <p className={s.total}>
            <span>{c.total[0]}</span>
            <span>{c.total[1]}</span>
          </p>
          <ol className={s.track}>
            <li className={s.trackLine} aria-hidden="true">
              <span className={s.trackFill} />
            </li>
            {c.track.map((label, i) => (
              <li key={label} className={s.node} data-done={i <= 2 ? '' : undefined}>
                {label}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Scene>
  )
}
