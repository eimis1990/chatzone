'use client'

import Image from 'next/image'
import { useState, useSyncExternalStore } from 'react'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const SERVER_SNAPSHOT = '0:0:0:0'

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string
  saveData?: boolean
}

function getConnection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

function getBrowserSnapshot() {
  const connection = getConnection()
  const slowConnection =
    connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g'

  return [
    1,
    window.matchMedia(REDUCED_MOTION_QUERY).matches ? 1 : 0,
    connection?.saveData ? 1 : 0,
    slowConnection ? 1 : 0,
  ].join(':')
}

function subscribeToBrowserPreferences(onStoreChange: () => void) {
  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  const connection = getConnection()

  motionQuery.addEventListener('change', onStoreChange)
  connection?.addEventListener('change', onStoreChange)

  return () => {
    motionQuery.removeEventListener('change', onStoreChange)
    connection?.removeEventListener('change', onStoreChange)
  }
}

/**
 * The still fox is the SSR/LCP layer. The small idle loop progressively covers
 * it only after hydration and playback, while reduced-motion and constrained
 * network visitors keep the still image.
 */
export function HeroFoxMedia() {
  const snapshot = useSyncExternalStore(
    subscribeToBrowserPreferences,
    getBrowserSnapshot,
    () => SERVER_SNAPSHOT,
  )
  const [hydrated, reducedMotion, saveData, slowConnection] = snapshot
    .split(':')
    .map((value) => value === '1')
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)
  const allowVideo = hydrated && !reducedMotion && !saveData && !slowConnection && !videoFailed

  return (
    <div className="landing-hero-fox pointer-events-none absolute z-[2] select-none">
      <Image
        src="/landing/hero-fox-higgsfield.webp"
        alt="Loqara's fox support agent standing ready to help"
        width={1038}
        height={2296}
        loading="eager"
        sizes="(max-width: 640px) 66vw, (max-width: 1024px) 42vw, 34vw"
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_24px_32px_rgba(16,18,19,0.12)]"
      />

      {allowVideo ? (
        <video
          src="/landing/hero-fox-idle.mp4"
          poster="/landing/hero-fox-higgsfield.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setVideoPlaying(true)}
          onError={() => setVideoFailed(true)}
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
            videoPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Your browser does not support background video.
        </video>
      ) : null}
    </div>
  )
}
