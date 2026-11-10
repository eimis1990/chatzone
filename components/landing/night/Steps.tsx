import type { CSSProperties } from 'react'
import { CheckIcon, GlobeIcon } from 'lucide-react'
import s from './night.module.css'

/** The three setup steps, each with a small drawing of what you actually do. */
export function Steps() {
  return (
    <section
      id="how"
      className={s.day}
      data-clock="780"
      data-tone="day"
      style={{ '--paper': '#f6f8f6' } as CSSProperties}
    >
      <div className={s.stepsWrap}>
        <h2 className={s.h2}>Live in an afternoon</h2>
        <p className={s.sub}>No engineers required: set it up, preview it, ship it.</p>

        <ol className={s.steps}>
          <li className={s.stepCol}>
            <p className={s.stepNum} aria-hidden="true">
              1
            </p>
            <h3 className={s.stepTitle}>Give it your material</h3>
            <p className={s.stepBody}>
              Documents, FAQs, your site, and your store for live products.
            </p>
            <div className={s.stepArt} aria-hidden="true">
              <p className={s.artUrl}>
                <GlobeIcon className="size-4 text-[#8a90a0]" />
                yourstore.com
              </p>
              {['Delivery and returns', 'Frequently asked questions', 'Product catalogue'].map(
                (page) => (
                  <p key={page} className={s.artRow}>
                    {page}
                    <CheckIcon className="size-4" strokeWidth={2.5} />
                  </p>
                ),
              )}
            </div>
          </li>

          <li className={s.stepCol}>
            <p className={s.stepNum} aria-hidden="true">
              2
            </p>
            <h3 className={s.stepTitle}>Make it yours</h3>
            <p className={s.stepBody}>
              Colours, launcher, language and voice, previewed as customers see it.
            </p>
            <div className={s.stepArt} aria-hidden="true">
              <p className={s.artBar} style={{ backgroundColor: '#2f7d5b' }}>
                Your store
              </p>
              <p className={s.artDots}>
                {['#e97634', '#2f7d5b', '#2563eb', '#7c3aed', '#14182b'].map((hex) => (
                  <i key={hex} style={{ backgroundColor: hex }} />
                ))}
              </p>
              <p className={s.artRow}>English, Lietuvių</p>
            </div>
          </li>

          <li className={s.stepCol}>
            <p className={s.stepNum} aria-hidden="true">
              3
            </p>
            <h3 className={s.stepTitle}>Paste one line</h3>
            <p className={s.stepBody}>
              Your agent is answering, and your inbox is ready for handoffs.
            </p>
            <div className={s.stepArt} aria-hidden="true">
              <p className={s.artCode}>
                {'<script\n  src="https://www.loqara.com/widget.js"\n  '}
                <b>data-bot-key</b>
                {'="your-key"\n></script>'}
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  )
}
