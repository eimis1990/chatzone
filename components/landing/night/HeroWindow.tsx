'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import Image from 'next/image'
import { FileTextIcon, RefreshCwIcon } from 'lucide-react'
import { ChairArt } from './art'
import s from './night.module.css'

type AskId = 'oak' | 'returns' | 'delivery'

interface Ask {
  id: AskId
  /** Chip text: the short form of the shopper's question. */
  label: string
  question: string
  answer: string
  /** What the answer was grounded in, shown under it. */
  proof: ReactNode
  products?: boolean
}

const ASKS: Ask[] = [
  {
    id: 'oak',
    label: 'Is it in oak?',
    question: 'Do you have the Luna chair in oak?',
    answer:
      'Yes, the Luna in oak is in stock. If you would like something darker, the Arlow in walnut is the closest match.',
    proof: (
      <>
        <RefreshCwIcon className="size-3.5" aria-hidden="true" />
        Price and stock read live from the store
      </>
    ),
    products: true,
  },
  {
    id: 'returns',
    label: 'Can I return it?',
    question: 'Can I return it if it does not suit the room?',
    answer:
      'Yes. You have 14 days from delivery to send it back unused, and the refund goes to the card you paid with.',
    proof: (
      <>
        <FileTextIcon className="size-3.5" aria-hidden="true" />
        Answered from the store&rsquo;s Returns page
      </>
    ),
  },
  {
    id: 'delivery',
    label: 'Delivery to Riga?',
    question: 'Do you deliver to Riga, and how long does it take?',
    answer:
      'We do. Furniture reaches Latvia in 3 to 5 working days, and delivery costs €19 per order.',
    proof: (
      <>
        <FileTextIcon className="size-3.5" aria-hidden="true" />
        Answered from the store&rsquo;s Delivery page
      </>
    ),
  },
]

const delay = (seconds: number) => ({ '--d': `${seconds}s` }) as CSSProperties

/**
 * The hero's lit window: one example conversation that plays on load, and
 * three questions the visitor can ask instead. Scripted, not the live bot:
 * every line is in the server HTML and the reveal is CSS only.
 */
export function HeroWindow() {
  const [askId, setAskId] = useState<AskId>('oak')
  // The first conversation waits for the page to settle; a chosen one starts at once.
  const [asked, setAsked] = useState(false)
  const t0 = asked ? 0 : 0.7

  return (
    <div className={s.window}>
      <div className={s.halo} aria-hidden="true" />
      <div className={s.spill} aria-hidden="true" />
      <div className={s.pane}>
        <div className={s.paneHead}>
          <span className={s.avatar}>
            <Image src="/loqara-logo-colorful.webp" alt="" fill sizes="36px" className="object-contain p-1" />
          </span>
          <div>
            <p className={s.paneName}>Demo store assistant</p>
            <p className={s.paneState}>
              <span className={s.live} aria-hidden="true" />
              Answering now
            </p>
          </div>
          <span className={s.paneTime}>02:47</span>
        </div>

        {/* All three conversations share one grid cell, so the window keeps the
            height of the longest and never resizes. Re-keying the chosen one
            remounts it, which restarts its CSS reveal. */}
        <div className={s.threads} aria-live="polite">
          {ASKS.map((a) => {
            const on = a.id === askId
            return (
              <div
                key={on ? a.id : `${a.id}-off`}
                className={s.thread}
                data-on={on ? '' : undefined}
                aria-hidden={!on}
              >
                <p className={`${s.msg} ${s.bubble} ${s.fromCustomer}`} style={delay(t0)}>
                  {a.question}
                </p>
                <div className={s.turn}>
                  <span className={s.typing} style={delay(t0 + 0.7)} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <p className={`${s.msg} ${s.bubble} ${s.fromAgent}`} style={delay(t0 + 1.7)}>
                    {a.answer}
                  </p>
                </div>
                {a.products && (
                  <div className={`${s.msg} ${s.cards}`} style={delay(t0 + 2.3)}>
                    <ProductCard title="Luna lounge chair, oak" price="€329" tint="#f4ecdd">
                      <ChairArt wood="#c79a5c" back="#e8dcc6" seat="#d9c9ac" />
                    </ProductCard>
                    <ProductCard title="Arlow lounge chair, walnut" price="€389" tint="#f1e4dc">
                      <ChairArt wood="#6a4327" back="#c96a3b" seat="#b3572d" />
                    </ProductCard>
                  </div>
                )}
                <p className={`${s.msg} ${s.note}`} style={delay(t0 + (a.products ? 2.9 : 2.3))}>
                  {a.proof}
                </p>
              </div>
            )
          })}
        </div>

        <div className={s.ask}>
          <p className={s.askLabel}>Ask it something else</p>
          <div className={s.chips}>
            {ASKS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={s.chip}
                aria-pressed={a.id === askId}
                onClick={() => {
                  setAskId(a.id)
                  setAsked(true)
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProductCard({
  title,
  price,
  tint,
  children,
}: {
  title: string
  price: string
  tint: string
  children: ReactNode
}) {
  return (
    <div className={s.card}>
      <div className={s.cardArt} style={{ backgroundColor: tint }}>
        {children}
      </div>
      <p className={s.cardTitle}>{title}</p>
      <p className={s.cardMeta}>
        <span className={s.price}>{price}</span>
        <span className={s.stock}>In stock</span>
      </p>
    </div>
  )
}
