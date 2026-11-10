'use client'

import { useState } from 'react'
import { MessageSquareIcon, PhoneIcon } from 'lucide-react'
import s from './night.module.css'

interface Conversation {
  id: string
  who: string
  /** Avatar colour. */
  tint: string
  time: string
  voice?: boolean
  subject: string
  /** The AI-written summary the inbox shows for every conversation. */
  summary: string
  topics: string[]
  /** The AI success score (1 to 5) every conversation gets, and its reason. */
  score: number
  why: string
  /** Waiting for a person; otherwise answered. */
  needsPerson?: boolean
}

// The four conversations the page has just played, newest first.
const NIGHT: Conversation[] = [
  {
    id: 'jonas',
    who: 'Jonas',
    tint: '#b4532a',
    time: '05:20',
    subject: 'Custom width for the Oslo sofa',
    summary:
      'Asked whether the Oslo sofa can be made 172 cm wide. Nothing in the store’s content covers custom sizes, so Loqara did not answer. It took his email and passed the conversation on.',
    topics: ['Custom sizes', 'Sofas'],
    score: 2,
    why: 'no content covered custom sizes, so the question went unanswered.',
    needsPerson: true,
  },
  {
    id: 'marta',
    who: 'Marta',
    tint: '#5b4bb5',
    time: '04:05',
    voice: true,
    subject: 'Small sofa for a two-metre wall',
    summary:
      'Voice call. Recommended the Oslo loveseat, 158 cm wide, and showed it on screen with its price and stock.',
    topics: ['Sofas', 'Dimensions'],
    score: 5,
    why: 'answered from the catalogue and showed the product.',
  },
  {
    id: 'ieva',
    who: 'Ieva',
    tint: '#2f7d5b',
    time: '03:12',
    subject: 'Where is order #10482',
    summary:
      'Asked in Lithuanian for an order status. Her email matched the order, so Loqara showed it: shipped.',
    topics: ['Orders'],
    score: 5,
    why: 'order found once the email matched.',
  },
  {
    id: 'visitor',
    who: 'Visitor',
    tint: '#3b6fb6',
    time: '02:47',
    subject: 'Luna chair in oak',
    summary:
      'Confirmed the Luna with oak legs is in stock and suggested the Arlow in walnut as the darker option.',
    topics: ['Chairs', 'Stock'],
    score: 5,
    why: 'answered from the catalogue with live stock.',
  },
]

/**
 * 07:30 — the payoff: the night's conversations, filed the way the product
 * files them (summary, AI success score with its reason, topics), with the one
 * that needs a person on top. Pick a row to read it; take Jonas over to see the handoff.
 */
export function Morning() {
  const [openId, setOpenId] = useState('jonas')
  const [takenOver, setTakenOver] = useState(false)

  return (
    <>
      <div className={s.sunrise} data-tone="night" aria-hidden="true">
        <div className={s.sun} />
      </div>
      <section className={s.day} data-clock="450" data-tone="day">
        <div className={s.split}>
          <div>
            <p className={s.when}>07:30</p>
            <h2 className={s.sceneTitle}>Good morning. Here is your night.</h2>
            <p className={s.sceneBody}>
              Every conversation is in your inbox with a summary, its topics and a quality score.
              The one that needs a person is at the top, and you can take it over in one click.
            </p>
          </div>

          <div className={`${s.inbox} ${s.rise}`}>
            <p className={s.inboxHead}>
              <b>Inbox</b>
              Example: last night, 4 conversations, 1 waiting for you
            </p>
            {NIGHT.map((c) => {
              const open = c.id === openId
              const Channel = c.voice ? PhoneIcon : MessageSquareIcon
              return (
                <div key={c.id} className={s.convo}>
                  <button
                    type="button"
                    className={s.row}
                    aria-expanded={open}
                    onClick={() => setOpenId(c.id)}
                  >
                    <span className={s.who} style={{ backgroundColor: c.tint }} aria-hidden="true">
                      {c.who[0]}
                    </span>
                    <span>
                      <span className={s.rowTitle}>
                        {c.who}
                        <Channel className="size-3.5 self-center text-[#8a90a0]" aria-hidden="true" />
                        <span className="sr-only">{c.voice ? 'voice call' : 'chat'}</span>
                        <time>{c.time}</time>
                      </span>
                      <span className={`${s.rowSub} block`}>{c.subject}</span>
                    </span>
                    <span className={s.tag} data-needs={c.needsPerson ? '' : undefined}>
                      {c.needsPerson ? (takenOver ? 'You are replying' : 'Needs a person') : `Answered ${c.score}/5`}
                    </span>
                  </button>
                  {open && (
                    <div className={s.detail}>
                      <p>{c.summary}</p>
                      <p className={s.scoreLine}>
                        <b>AI success {c.score}/5:</b> {c.why}
                      </p>
                      <ul className={s.topics} aria-label="Topics">
                        {c.topics.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      {c.needsPerson && (
                        <button
                          type="button"
                          className={s.takeover}
                          aria-pressed={takenOver}
                          onClick={() => setTakenOver((v) => !v)}
                        >
                          {takenOver ? 'Return to bot' : 'Take over'}
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
    </>
  )
}
