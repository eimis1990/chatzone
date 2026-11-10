'use client'

import { useState, type ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import s from './night.module.css'

// The night's four conversations again, as the Analytics screen totals them.
// Labels are the product's own metric names (AnalyticsSection).
const LAST_NIGHT = [
  ['4', 'Conversations'],
  ['4.3/5', 'AI success'],
  ['3', 'Product suggestions'],
  ['1', 'Leads'],
]

interface Opportunity {
  id: string
  /** Demand Radar's three issue types (lib/demand-radar.ts). */
  kind: 'Knowledge gap' | 'Product gap' | 'Store limitation'
  title: string
  shoppers: number
  evidence: string
  heard: string
  /** The action offered, in the product's wording. */
  action: string
  draft: ReactNode
  button: string
  /** What approving did. Only an FAQ and a synonym change the assistant;
   *  everything else in the radar is a saved review task. Keep it that way here. */
  done: string
}

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'widths',
    kind: 'Knowledge gap',
    title: 'Custom sofa widths',
    shoppers: 3,
    evidence: 'Can you make the Oslo sofa 172 cm wide?',
    heard: 'Jonas, 05:20',
    action: 'Add an FAQ',
    draft: (
      <>
        <b>Can the Oslo sofa be made in a custom width?</b>
        No. The Oslo comes in three widths: 158, 198 and 228 cm.
      </>
    ),
    button: 'Approve and add',
    done: 'Added to its knowledge. The assistant answers this from now on.',
  },
  {
    id: 'couch',
    kind: 'Product gap',
    title: 'Searches for “couch” find nothing',
    shoppers: 4,
    evidence: 'Do you have a grey couch?',
    heard: 'Tuesday, 21:40',
    action: 'Add a missing synonym',
    draft: (
      <>
        <b>Shoppers say “couch”.</b>
        Your catalogue says “sofa”. Treat them as the same word in product search.
      </>
    ),
    button: 'Approve and add',
    done: 'Added. Searches for “couch” now find your sofas.',
  },
  {
    id: 'instalments',
    kind: 'Store limitation',
    title: 'Paying in instalments',
    shoppers: 2,
    evidence: 'Can I pay for the sofa in three parts?',
    heard: 'Sunday, 14:05',
    action: 'For your store to decide',
    draft: (
      <>
        <b>Nothing to switch on here.</b>
        The assistant can only say what your store offers. The radar keeps the evidence so you
        can weigh it.
      </>
    ),
    button: 'Save for review',
    done: 'Saved to your review list.',
  },
]

/**
 * 08:30 — what the night taught the store. The question nobody had answered
 * (Jonas, 05:20) is back as a ranked opportunity, and approving the fix is one
 * click. Analytics totals the same four conversations above it.
 */
export function Radar() {
  const [openId, setOpenId] = useState('widths')
  const [approved, setApproved] = useState<string[]>([])

  return (
    <section className={s.day} data-clock="510" data-tone="day">
      <div className={s.split}>
        <div>
          <p className={s.when}>08:30</p>
          <h2 className={s.sceneTitle}>Jonas was the third to ask that this week.</h2>
          <p className={s.sceneBody}>
            Demand Radar groups the questions your assistant could not resolve and ranks them by
            how many shoppers asked: answers missing from your content, products people search for
            and don&rsquo;t find, things your store doesn&rsquo;t offer. Approve an FAQ or a
            search synonym and the assistant uses it from then on.
          </p>
          <p className={s.sceneBody}>
            Analytics covers the rest: an AI success score for every conversation, CSAT, product
            clicks, and how much of it happened after hours.
          </p>
        </div>

        <div className={`${s.inbox} ${s.rise}`}>
          <p className={s.inboxHead}>
            <b>Analytics</b>
            Example: last night
          </p>
          <dl className={s.stats}>
            {LAST_NIGHT.map(([value, label]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          <p className={s.inboxHead}>
            <b>Demand Radar</b>
            Example: last 7 days
          </p>
          {OPPORTUNITIES.map((o) => {
            const open = o.id === openId
            const done = approved.includes(o.id)
            return (
              <div key={o.id} className={s.convo}>
                <button
                  type="button"
                  className={s.row}
                  aria-expanded={open}
                  onClick={() => setOpenId(o.id)}
                >
                  <span className={s.count} aria-hidden="true">
                    {o.shoppers}
                  </span>
                  <span>
                    <span className={s.rowTitle}>{o.title}</span>
                    <span className={`${s.rowSub} block`}>{o.shoppers} shoppers asked</span>
                  </span>
                  <span className={s.tag} data-kind={done ? 'done' : 'open'}>
                    {done ? 'Handled' : o.kind}
                  </span>
                </button>
                {open && (
                  <div className={s.detail}>
                    <p className={s.quote}>
                      &ldquo;{o.evidence}&rdquo; <span>{o.heard}</span>
                    </p>
                    <p className={s.draft}>
                      <span>{o.action}</span>
                      {o.draft}
                    </p>
                    {done ? (
                      <p className={s.doneNote}>
                        <CheckIcon className="size-4" strokeWidth={2.5} aria-hidden="true" />
                        {o.done}
                      </p>
                    ) : (
                      <button
                        type="button"
                        className={s.takeover}
                        onClick={() => setApproved((a) => [...a, o.id])}
                      >
                        {o.button}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
