'use client'

import { useState, type CSSProperties } from 'react'
import { CheckIcon } from 'lucide-react'
import { display } from './fonts'
import s from './night.module.css'

type Lang = 'lt' | 'en'

// Order labels mirror the real widget's OrderStatusCard, so the scene shows
// what a shopper actually sees.
const COPY = {
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
} as const

const LANGS: { id: Lang; label: string }[] = [
  { id: 'lt', label: 'Lietuvių' },
  { id: 'en', label: 'English' },
]

/** Where in the pinned scroll (as % of the pin) a step fades in. */
const at = (from: number, to: number) => ({ '--from': `${from}%`, '--to': `${to}%` }) as CSSProperties

/**
 * 03:12 — verified order status, in the shopper's language. The stage pins on
 * desktop and scrolling plays the conversation; the language switch is the
 * same choice a visitor gets in the widget.
 */
export function SceneOrder() {
  const [lang, setLang] = useState<Lang>('lt')
  const c = COPY[lang]

  return (
    <section id="night" className={`${s.scene} ${display.variable}`} data-night="192">
      <div className={s.stars} aria-hidden="true" />
      <div className={s.stage}>
        <div className={s.sceneCopy}>
          <p className={s.when}>03:12</p>
          <h2 className={s.sceneTitle}>
            Ieva can&rsquo;t sleep. She wants to know where her order is.
          </h2>
          <p className={s.sceneBody}>
            Her widget is set to Lithuanian, so Loqara answers in Lithuanian. It asks which email
            she ordered with, and shows the order only once the number and the email match. Order
            lookup works on WooCommerce and Magento stores.
          </p>
          <div className={s.lang}>
            <span id="scene-order-lang">Read the conversation in</span>
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
        </div>

        <div className={s.talk} lang={lang}>
          <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(3, 11)}>
            {c.ask}
          </p>
          <p className={`${s.step} ${s.bubble} ${s.fromAgent}`} style={at(17, 25)}>
            {c.reply}
          </p>
          <p className={`${s.step} ${s.bubble} ${s.fromCustomer}`} style={at(31, 39)}>
            ieva@pastas.lt
          </p>
          <p className={`${s.step} ${s.verify}`} style={at(46, 55)}>
            <span className={s.tick}>
              <CheckIcon className="size-3.5" strokeWidth={3} aria-hidden="true" />
            </span>
            {c.match}
          </p>
          <div className={`${s.step} ${s.order}`} style={at(62, 72)}>
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
      </div>
    </section>
  )
}
