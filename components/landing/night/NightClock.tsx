'use client'

import { useEffect, useRef } from 'react'
import { MoonIcon } from 'lucide-react'
import s from './night.module.css'

// ponytail: the last scene just runs half an hour while it is pinned; give it
// its own end time if a scene ever needs a different pace.
const LAST_SCENE_MINUTES = 30

const fmt = (minutes: number) => {
  const m = Math.round(minutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

/**
 * The scroll clock. Every night section carries `data-night` (minutes past
 * midnight); scrolling between two of them runs the clock from one time to the
 * next, so scrolling the page is the night passing. Written straight to the
 * DOM: no React render per scroll frame.
 */
export function NightClock() {
  const box = useRef<HTMLSpanElement>(null)
  const time = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const scenes = [...document.querySelectorAll<HTMLElement>('[data-night]')]
    if (!scenes.length) return
    let raf = 0

    const update = () => {
      raf = 0
      const y = window.scrollY
      const stops = scenes.map((el) => ({
        top: el.getBoundingClientRect().top + y,
        at: Number(el.dataset.night),
      }))
      const lastEl = scenes[scenes.length - 1]
      const end = lastEl.getBoundingClientRect().bottom + y - window.innerHeight
      stops.push({ top: end, at: stops[stops.length - 1].at + LAST_SCENE_MINUTES })

      let i = 0
      while (i < stops.length - 2 && y >= stops[i + 1].top) i++
      const span = Math.max(stops[i + 1].top - stops[i].top, 1)
      const p = Math.min(Math.max((y - stops[i].top) / span, 0), 1)
      if (time.current) time.current.textContent = fmt(stops[i].at + (stops[i + 1].at - stops[i].at) * p)
      // Past the night, the clock has nothing to say.
      if (box.current) box.current.toggleAttribute('data-off', y > end + window.innerHeight * 0.4)
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
    <span ref={box} className={s.clock} aria-hidden="true">
      <MoonIcon className="size-3.5" />
      <span ref={time}>02:47</span>
    </span>
  )
}
