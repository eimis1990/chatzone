'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { useReducedMotion } from 'framer-motion'

const subscribeToHydration = () => () => {}

/**
 * Hero background: the lobby starts empty, the fox leans in from the right, waves,
 * and settles into the standing pose (intro) once, then we crossfade to a looping
 * idle clip. The intro ends on the same standing frame the loop begins on, so the
 * handoff is seamless. Under reduced-motion we show the static poster only.
 */
export function HeroVideo() {
  const reduce = useReducedMotion()
  // Keep the server and the first client render identical. Motion preferences
  // are browser-only, so the poster is the safe hydration snapshot; video is a
  // progressive enhancement after React has attached.
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false)
  const [introDone, setIntroDone] = useState(false)
  const loopRef = useRef<HTMLVideoElement>(null)

  if (!hydrated || reduce) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/loqara-hero-poster.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-center"
      />
    )
  }

  // On mobile (tall crop) shift toward the fox on the right; centered on desktop.
  const base =
    'absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-center transition-opacity duration-500'

  return (
    <>
      {/* Idle loop — preloaded underneath, revealed once the intro ends. */}
      <video
        ref={loopRef}
        src="/loqara-hero-loop.mp4"
        poster="/loqara-hero-poster.webp"
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className={`${base} ${introDone ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Intro — empty lobby, then the fox leans in, waves, and settles into the
          standing pose; autoplays once, then hands off to the loop. */}
      <video
        src="/loqara-hero-intro.mp4"
        poster="/loqara-hero-empty-poster.webp"
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onEnded={() => {
          loopRef.current?.play().catch(() => {})
          setIntroDone(true)
        }}
        className={`${base} ${introDone ? 'opacity-0' : 'opacity-100'}`}
      />
    </>
  )
}
