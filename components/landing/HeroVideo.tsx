'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  getHeroMediaPolicy,
  HERO_MEDIA_SOURCES,
  type HeroMediaVariant,
} from '@/lib/hero-media'

const MOBILE_QUERY = '(max-width: 767px)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const SUPPORTED_VARIANTS: readonly HeroMediaVariant[] = ['desktop', 'mobile']
const SERVER_PREFERENCE_SNAPSHOT = '0:0:0:0:0'

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string
  saveData?: boolean
}

function getConnection(): NetworkInformationLike | undefined {
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
}

function getBrowserPreferenceSnapshot() {
  const connection = getConnection()
  const effectiveType = connection?.effectiveType
  const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g'

  return [
    1,
    window.matchMedia(MOBILE_QUERY).matches ? 1 : 0,
    window.matchMedia(REDUCED_MOTION_QUERY).matches ? 1 : 0,
    connection?.saveData ? 1 : 0,
    slowConnection ? 1 : 0,
  ].join(':')
}

function subscribeToBrowserPreferences(onStoreChange: () => void) {
  const mobileQuery = window.matchMedia(MOBILE_QUERY)
  const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  const connection = getConnection()

  mobileQuery.addEventListener('change', onStoreChange)
  motionQuery.addEventListener('change', onStoreChange)
  connection?.addEventListener('change', onStoreChange)

  return () => {
    mobileQuery.removeEventListener('change', onStoreChange)
    motionQuery.removeEventListener('change', onStoreChange)
    connection?.removeEventListener('change', onStoreChange)
  }
}

function HeroPoster({ withFox }: { withFox: boolean }) {
  const posterKey = withFox ? 'foxPoster' : 'emptyPoster'

  return (
    <picture className="absolute inset-0 block h-full w-full">
      <source media={MOBILE_QUERY} srcSet={HERO_MEDIA_SOURCES.mobile[posterKey]} />
      <img
        src={HERO_MEDIA_SOURCES.desktop[posterKey]}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover object-center"
      />
    </picture>
  )
}

/**
 * The lobby poster is always present first. Video is a progressive enhancement:
 * an intro downloads and plays alone, then the small idle loop is requested only
 * after the intro has ended. Data-saving, slow-network, and reduced-motion users
 * stay on a responsive static poster.
 */
export function HeroVideo() {
  const preferenceSnapshot = useSyncExternalStore(
    subscribeToBrowserPreferences,
    getBrowserPreferenceSnapshot,
    () => SERVER_PREFERENCE_SNAPSHOT,
  )
  const [hydrated, mobileViewport, reducedMotion, saveData, slowConnection] =
    preferenceSnapshot.split(':').map((value) => value === '1')
  const [loopRequested, setLoopRequested] = useState(false)
  const [loopPlaying, setLoopPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const policy = getHeroMediaPolicy({
    hydrated,
    mobileViewport,
    reducedMotion,
    saveData,
    slowConnection,
    supportedVariants: SUPPORTED_VARIANTS,
  })

  if (policy.mode === 'poster' || failed) {
    return <HeroPoster withFox={hydrated} />
  }

  const media = HERO_MEDIA_SOURCES[policy.variant]
  const videoClassName =
    'absolute inset-0 h-full w-full object-cover object-center transition-opacity duration-300'

  const playOrUsePoster = (video: HTMLVideoElement) => {
    video.play().catch(() => setFailed(true))
  }

  return (
    <>
      <HeroPoster withFox={false} />

      <video
        src={media.intro}
        poster={media.emptyPoster}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
        onCanPlay={(event) => playOrUsePoster(event.currentTarget)}
        onEnded={() => setLoopRequested(true)}
        onError={() => setFailed(true)}
        className={`${videoClassName} ${loopPlaying ? 'opacity-0' : 'opacity-100'}`}
      />

      {loopRequested ? (
        <video
          src={media.loop}
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          tabIndex={-1}
          onCanPlay={(event) => playOrUsePoster(event.currentTarget)}
          onPlaying={() => setLoopPlaying(true)}
          onError={() => setFailed(true)}
          className={`${videoClassName} ${loopPlaying ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}
    </>
  )
}
