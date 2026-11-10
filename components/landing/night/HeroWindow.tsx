'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import {
  FileTextIcon,
  MicIcon,
  PhoneIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SendHorizontalIcon,
} from 'lucide-react'
import { ProductCards } from '@/components/widget/ProductCards'
import type { CommerceProduct } from '@/lib/commerce/types'
import s from './night.module.css'

const PRIMARY = '#e97634'
const FOX = '/loqara-logo-colorful.webp'

type AskId = 'oak' | 'returns' | 'delivery'

interface Ask {
  id: AskId
  /** Pill text: the short form of the shopper's question. */
  label: string
  /** Short enough to be typed into the composer field without clipping. */
  question: string
  answer: string
  /** What the answer was grounded in, shown under it. */
  proof: ReactNode
  products?: boolean
}

const ASKS: Ask[] = [
  {
    id: 'oak',
    label: 'Luna in oak?',
    question: 'Do you have the Luna in oak?',
    answer:
      'Yes, the Luna with oak legs is in stock. If you prefer darker wood, the Arlow has a walnut frame.',
    proof: (
      <>
        <RefreshCwIcon className="size-3" aria-hidden="true" />
        Price and stock read live from the store
      </>
    ),
    products: true,
  },
  {
    id: 'returns',
    label: 'Can I return it?',
    question: 'Can I return it if it doesn’t fit?',
    answer:
      'Yes. You have 14 days from delivery to send it back unused, and the refund goes to the card you paid with.',
    proof: (
      <>
        <FileTextIcon className="size-3" aria-hidden="true" />
        Answered from the store&rsquo;s Returns page
      </>
    ),
  },
  {
    id: 'delivery',
    label: 'Delivery to Riga?',
    question: 'Do you deliver to Riga?',
    answer:
      'We do. Furniture reaches Latvia in 3 to 5 working days, and delivery costs €19 per order.',
    proof: (
      <>
        <FileTextIcon className="size-3" aria-hidden="true" />
        Answered from the store&rsquo;s Delivery page
      </>
    ),
  },
]

const PRODUCTS: CommerceProduct[] = [
  {
    id: 'luna',
    title: 'Luna chair, oak legs',
    price: '€329',
    url: '#',
    imageUrl: '/component-previews/chair.webp',
    inStock: true,
  },
  {
    id: 'arlow',
    title: 'Arlow armchair, walnut',
    price: '€389',
    url: '#',
    imageUrl: '/component-previews/chair-walnut.webp',
    inStock: true,
  },
]

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/**
 * The hero's lit window: the Loqara widget, playing one example conversation
 * on load. The question is typed into the composer, sent, and answered; the
 * pills (or the composer itself) ask another. Scripted, not the live bot:
 * every line is in the server HTML and the whole reveal is CSS delays, so it
 * plays before hydration and reads complete without JavaScript.
 */
export function HeroWindow() {
  const [askId, setAskId] = useState<AskId>('oak')
  // 0 is the conversation that plays on load, which waits for the page to
  // settle. Every pick after that bumps the counter: it re-keys the animated
  // nodes (restarting their CSS) and starts at once.
  const [run, setRun] = useState(0)
  const t0 = run === 0 ? 0.6 : 0
  const index = ASKS.findIndex((a) => a.id === askId)
  const ask = ASKS[index]

  const play = (id: AskId) => {
    setAskId(id)
    setRun((r) => r + 1)
  }

  return (
    <div className={s.window}>
      <div className={s.halo} aria-hidden="true" />
      <div className={s.spill} aria-hidden="true" />
      <div className={s.pane}>
        <div className={s.paneHead}>
          <span className={s.avatar}>
            <Image src={FOX} alt="" fill sizes="32px" className="object-contain p-0.5" />
          </span>
          <div className={s.paneId}>
            <p className={s.paneName}>Demo store</p>
            <p className={s.paneState}>
              <span className={s.live} aria-hidden="true" />
              Online
            </p>
          </div>
          <div className={s.paneTools} aria-hidden="true">
            <span>EN</span>
            <span>
              <PhoneIcon className="size-4" />
            </span>
            <span>
              <RotateCcwIcon className="size-4" />
            </span>
          </div>
        </div>

        <div className={s.paneBody}>
          <p className={s.stamp}>Today, 02:47</p>

          <div className={s.threads} aria-live="polite">
            {ASKS.map((a) => {
              const on = a.id === askId
              return (
                <div
                  key={on ? `${a.id}-${run}` : `${a.id}-off`}
                  className={s.thread}
                  data-on={on ? '' : undefined}
                  aria-hidden={!on}
                >
                  <p className={`${s.msg} ${s.bubble} ${s.fromCustomer}`} style={delay(t0 + 1.05)}>
                    {a.question}
                  </p>
                  <div className={s.botRow}>
                    <span className={`${s.msg} ${s.botAvatar}`} style={delay(t0 + 1.6)}>
                      <Image src={FOX} alt="" fill sizes="28px" className="object-contain p-0.5" />
                    </span>
                    <div className={s.turn}>
                      <span className={s.typing} style={delay(t0 + 1.6)} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <p className={`${s.msg} ${s.bubble} ${s.fromAgent}`} style={delay(t0 + 2.6)}>
                        {a.answer}
                      </p>
                    </div>
                  </div>
                  {a.products && (
                    // The real widget component. Inert here: its tiles link out.
                    <div
                      className={`${s.msg} ${s.products}`}
                      style={delay(t0 + 3.2)}
                      aria-hidden="true"
                    >
                      <ProductCards products={PRODUCTS} primaryColor={PRIMARY} variant="grid" />
                    </div>
                  )}
                  <p className={`${s.msg} ${s.note}`} style={delay(t0 + (a.products ? 3.8 : 3.2))}>
                    {a.proof}
                  </p>
                </div>
              )
            })}
          </div>

          <div className={s.chips}>
            {ASKS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={s.chip}
                aria-pressed={a.id === askId}
                onClick={() => play(a.id)}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className={s.composer}>
            <button
              type="button"
              className={s.field}
              aria-label="Ask the next example question"
              onClick={() => play(ASKS[(index + 1) % ASKS.length].id)}
            >
              <span key={`p-${run}`} className={s.placeholder} style={delay(t0)}>
                Type a message…
              </span>
              <span key={`t-${run}`} className={s.typed} style={delay(t0)}>
                {ask.question}
              </span>
            </button>
            <span className={s.micBtn} aria-hidden="true">
              <MicIcon className="size-4" />
            </span>
            <span key={`s-${run}`} className={s.sendBtn} style={delay(t0)} aria-hidden="true">
              <SendHorizontalIcon className="size-4" />
            </span>
          </div>

          <p className={s.powered}>
            Powered by
            <Image src={FOX} alt="" width={12} height={12} className="size-3" />
            <b>Loqara</b>
          </p>
        </div>
      </div>
    </div>
  )
}
