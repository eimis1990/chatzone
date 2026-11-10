'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Image from 'next/image'
import s from './night.module.css'

/**
 * The Loqara fox, idling. The still (the loop's first frame, so the two line
 * up) is server HTML, and is all that reduced-motion and Save-Data visitors
 * get. The transparent loop loads only when the fox nears the screen, and
 * replaces the still only once a frame proves to be transparent: a browser
 * that plays the file but drops its alpha would paint a box behind the fox.
 *
 * Assets come from scripts/key-hero-fox.sh. `children` are placed relative to
 * the fox (its speech bubble).
 */
export function NightFox({ children }: { children?: ReactNode }) {
  const video = useRef<HTMLVideoElement>(null)
  const checked = useRef(false)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = video.current
    if (!el) return
    const { connection } = navigator as Navigator & { connection?: { saveData?: boolean } }
    if (connection?.saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    // preload="none": nothing is fetched until the first play().
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { rootMargin: '300px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const proveAlpha = () => {
    const el = video.current
    if (checked.current || !el || el.currentTime === 0) return
    checked.current = true
    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    // The frame's top-left corner is empty in every frame of the loop.
    ctx.drawImage(el, 0, 0, 4, 4, 0, 0, 1, 1)
    if (ctx.getImageData(0, 0, 1, 1).data[3] === 0) setLive(true)
  }

  return (
    <div className={s.fox} data-live={live ? '' : undefined} data-testid="night-fox">
      <Image
        src="/landing/hero-fox-idle-poster.webp"
        alt="The Loqara fox, in a grey suit and a headset"
        width={720}
        height={1280}
        sizes="(min-width: 640px) 17rem, 12.5rem"
      />
      <video
        ref={video}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onTimeUpdate={proveAlpha}
      >
        {/* HEVC+alpha is the only transparent video Safari plays; VP9+alpha covers
            Chromium and Firefox. No opaque fallback: the still is the fallback. */}
        <source src="/landing/hero-fox-idle-hevc.mp4" type='video/mp4; codecs="hvc1"' />
        <source src="/landing/hero-fox-idle.webm" type="video/webm" />
      </video>
      {children}
    </div>
  )
}
