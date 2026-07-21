export type HeroMediaVariant = 'desktop' | 'mobile'

export type HeroMediaPolicy =
  | { mode: 'poster' }
  | { mode: 'video'; variant: HeroMediaVariant }

export interface HeroMediaPreferences {
  hydrated: boolean
  reducedMotion: boolean
  saveData: boolean
  slowConnection: boolean
  mobileViewport: boolean
  supportedVariants: readonly HeroMediaVariant[]
}

export const HERO_MEDIA_SOURCES: Record<
  HeroMediaVariant,
  { intro: string; loop: string; emptyPoster: string; foxPoster: string }
> = {
  desktop: {
    intro: '/loqara-hero-intro-desktop.mp4',
    loop: '/loqara-hero-loop-desktop.mp4',
    emptyPoster: '/loqara-hero-empty-poster-desktop.webp',
    foxPoster: '/loqara-hero-poster-desktop.webp',
  },
  mobile: {
    intro: '/loqara-hero-intro-mobile.mp4',
    loop: '/loqara-hero-loop-mobile.mp4',
    emptyPoster: '/loqara-hero-empty-poster-mobile.webp',
    foxPoster: '/loqara-hero-poster-mobile.webp',
  },
}

/**
 * Decide whether hero video is an appropriate progressive enhancement.
 * Keeping this browser-independent makes the network policy easy to test.
 */
export function getHeroMediaPolicy({
  hydrated,
  reducedMotion,
  saveData,
  slowConnection,
  mobileViewport,
  supportedVariants,
}: HeroMediaPreferences): HeroMediaPolicy {
  if (!hydrated || reducedMotion || saveData || slowConnection) {
    return { mode: 'poster' }
  }

  const preferred: HeroMediaVariant = mobileViewport ? 'mobile' : 'desktop'
  if (supportedVariants.includes(preferred)) {
    return { mode: 'video', variant: preferred }
  }

  const fallback = supportedVariants[0]
  return fallback ? { mode: 'video', variant: fallback } : { mode: 'poster' }
}
