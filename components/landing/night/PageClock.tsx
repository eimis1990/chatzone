'use client'

import { useEffect, useRef } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'
import s from './night.module.css'

const DAY = 24 * 60
const SUNRISE = 6 * 60 + 30
const SUNSET = 18 * 60 + 30

const fmt = (minutes: number) => {
  const m = Math.round(minutes) % DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * The page's clock, in the nav bar. Every section carries `data-clock`
 * (minutes since the first midnight); scrolling between two of them runs the
 * clock from one time to the next, so scrolling the page is a day passing:
 * 02:47 in the hero, round to 02:47 the next night at the close. Written
 * straight to the DOM: no React render per scroll frame.
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
      let i = 0
      while (i < stops.length - 2 && y >= stops[i + 1].top) i++
      const span = Math.max(stops[i + 1].top - stops[i].top, 1)
      const p = Math.min(Math.max((y - stops[i].top) / span, 0), 1)
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
      <span ref={time}>02:47</span>
    </span>
  )
}
