import type { CSSProperties, ReactNode } from 'react'
import s from './night.module.css'

/** Where in the pinned scroll (as % of the pin) a step fades in. */
export const at = (from: number, to: number) =>
  ({ '--from': `${from}%`, '--to': `${to}%` }) as CSSProperties

/**
 * One stop in the night. On desktop the section is taller than the screen and
 * its stage pins, so scrolling plays the `step` children instead of moving the
 * page; the sky gradient keeps sliding behind it. Copy is first in the DOM and
 * sits on the right; `children` is the visual, on the left.
 *
 * `minutes` is the scene's time past midnight, read by the nav clock.
 */
export function Scene({
  id,
  minutes,
  when,
  title,
  body,
  aside,
  sky,
  stars = 0.6,
  children,
}: {
  id?: string
  minutes: number
  when: string
  title: ReactNode
  body: ReactNode
  /** Controls under the copy. */
  aside?: ReactNode
  /** The section's background: a vertical gradient that starts where the previous scene ended. */
  sky: string
  /** Star opacity; they thin out toward dawn. */
  stars?: number
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={s.scene}
      data-clock={minutes}
      data-tone="night"
      style={{ '--sky': sky, '--star-opacity': stars } as CSSProperties}
    >
      <div className={s.stars} aria-hidden="true">
        <i />
        <i />
      </div>
      <div className={s.stage}>
        <div className={s.sceneCopy}>
          <p className={s.when}>{when}</p>
          <h2 className={s.sceneTitle}>{title}</h2>
          <p className={s.sceneBody}>{body}</p>
          {aside}
        </div>
        {children}
      </div>
    </section>
  )
}
