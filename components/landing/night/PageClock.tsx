'use client'

import { useEffect, useRef } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import s from './night.module.css'

const DAY = 24 * 60
const SUNRISE = 6 * 60 + 30
const SUNSET = 18 * 60 + 30

/** 12-hour, like every other time on the page ("2:47 AM"). */
const fmt = (minutes: number) => {
  const m = Math.round(minutes) % DAY
  const hour = Math.floor(m / 60)
  return `${hour % 12 || 12}:${String(m % 60).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`
}

/**
 * The page's clock, in the nav bar. Every section carries `data-clock`
 * (minutes since the first midnight). While a section fills the screen the
 * clock shows that section's own time, so it always agrees with the time
 * printed in the scene; it runs forward to the next section's time only over
 * the last screen-height of scroll, as that section slides in. Scrolling the
 * page is a day passing: 2:47 AM in the hero, round to 2:47 AM the next night.
 * Written straight to the DOM: no React render per scroll frame.
 */
export function PageClock() {
  const box = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-clock]')]
    if (scenes.length < 2) return
    let raf = 0

    const update = () => {
      raf = 0
      const y = window.scrollY
      const stops = scenes.map((el) => ({
        top: el.getBoundingClientRect().top + y,
        at: Number(el.dataset.clock),
      }))
      // A section counts as reached a little before its top meets the top of
      // the screen, when its heading is already what you are reading.
      const vh = window.innerHeight
      const lead = vh * 0.18
      let i = 0
      while (i < stops.length - 2 && y >= stops[i + 1].top - lead) i++
      const end = stops[i + 1].top - lead
      const from = Math.max(stops[i].top, end - vh * 0.7)
      const p = Math.min(Math.max((y - from) / Math.max(end - from, 1), 0), 1)
      const now = stops[i].at + (stops[i + 1].at - stops[i].at) * p
      if (time.current) time.current.textContent = fmt(now)
      const ofDay = now % DAY
      box.current?.toggleAttribute('data-sun', ofDay >= SUNRISE && ofDay < SUNSET)
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <span ref={box} className={s.clock} aria-hidden="true" data-testid="page-clock">
      <MoonIcon className="size-3.5" />
      <SunIcon className="size-3.5" />
      <span ref={time}>2:47 AM</span>
    </span>
  )
}
