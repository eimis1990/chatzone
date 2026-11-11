'use client'

import { useState, type ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { GetStartedDialog } from '../GetStartedDialog'
import s from './night.module.css'

// The night's four conversations again, as the Analytics screen totals them.
// Labels are the product's own metric names (AnalyticsSection).
const LAST_NIGHT = [
  ['4', 'Conversations'],
  ['4.3/5', 'AI success'],
  ['3', 'Products shown'],
  ['1', 'Leads'],
]

interface Opportunity {
  id: string
  /** Demand Radar's three issue types (lib/demand-radar.ts), in plain words:
   *  knowledge gap, product gap, store limitation. */
  kind: 'Missing answer' | 'Not found in search' | 'Not offered'
  title: string
  shoppers: number
  evidence: string
  heard: string
  /** The action offered. */
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
    kind: 'Missing answer',
    title: 'Custom sofa widths',
    shoppers: 3,
    evidence: 'Can you make the Oslo sofa 172 cm wide?',
    heard: 'Jonas, 5:20 AM',
    action: 'Add an answer',
    draft: (
      <>
        <b>Can the Oslo sofa be made in a custom width?</b>
        No. The Oslo comes in three widths: 158, 198 and 228 cm.
      </>
    ),
    button: 'Approve and add',
    done: 'Added. Your assistant answers this from now on.',
  },
  {
    id: 'couch',
    kind: 'Not found in search',
    title: 'Searches for “couch” find nothing',
    shoppers: 4,
    evidence: 'Do you have a gray couch?',
    heard: 'Tuesday, 9:40 PM',
    action: 'Teach it the word',
    draft: (
      <>
        <b>Shoppers say “couch”.</b>
        Your catalog says “sofa”. Treat them as the same word in product search.
      </>
    ),
    button: 'Approve and add',
    done: 'Added. Searches for “couch” now find your sofas.',
  },
  {
    id: 'installments',
    kind: 'Not offered',
    title: 'Paying in installments',
    shoppers: 2,
    evidence: 'Can I pay for the sofa in three parts?',
    heard: 'Sunday, 2:05 PM',
    action: 'For you to decide',
    draft: (
      <>
        <b>Nothing to switch on here.</b>
        Your assistant can only say what your store offers. The evidence is kept so you can weigh
        it.
      </>
    ),
    button: 'Save for review',
    done: 'Saved to your review list.',
  },
]

/**
 * 8:30 AM — what the night taught the store. The question nobody had answered
 * (Jonas, 5:20 AM) is back as a ranked opportunity, and approving the fix is
 * one click. Analytics totals the same four conversations above it. This is
 * also where the page asks for the preview: the visitor has now seen a whole
 * night and its morning.
 */
export function Radar() {
  const [openId, setOpenId] = useState('widths')
  const [approved, setApproved] = useState<string[]>([])

  return (
    <section className={s.day} data-clock="510" data-tone="day">
      <div className={s.split}>
        <div>
          <p className={s.when}>8:30 AM</p>
          <h2 className={s.sceneTitle}>Jonas was the third to ask that this week.</h2>
          <p className={s.sceneBody}>
            Demand Radar shows you what shoppers asked for and didn&rsquo;t get, ranked by how many
            asked. One click turns the top one into an answer your assistant gives from then on.
            Analytics shows the rest: how many shoppers it helped, which products they clicked,
            and how much of it happened after you closed.
          </p>
          <p className={s.gain}>Every unanswered question tells you what to fix next.</p>
          <div className={s.ask}>
            <GetStartedDialog
              source="radar"
              triggerClassName="relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-primary px-7 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14182b]"
            />
            <p>Free. We email you a preview of your own store within one working day.</p>
          </div>
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
