import { describe, expect, it } from 'vitest'
import { getHeroMediaPolicy, type HeroMediaPreferences } from '@/lib/hero-media'

const defaultPreferences: HeroMediaPreferences = {
  hydrated: true,
  reducedMotion: false,
  saveData: false,
  slowConnection: false,
  mobileViewport: false,
  supportedVariants: ['desktop', 'mobile'],
}

describe('getHeroMediaPolicy', () => {
  it.each([
    ['before hydration', { hydrated: false }],
    ['for reduced motion', { reducedMotion: true }],
    ['when save-data is enabled', { saveData: true }],
    ['on a very slow connection', { slowConnection: true }],
  ])('stays poster-only %s', (_label, override) => {
    expect(getHeroMediaPolicy({ ...defaultPreferences, ...override })).toEqual({
      mode: 'poster',
    })
  })

  it('selects the desktop encode for a wide viewport', () => {
    expect(getHeroMediaPolicy(defaultPreferences)).toEqual({
      mode: 'video',
      variant: 'desktop',
    })
  })

  it('selects the mobile encode for a narrow viewport', () => {
    expect(
      getHeroMediaPolicy({ ...defaultPreferences, mobileViewport: true }),
    ).toEqual({ mode: 'video', variant: 'mobile' })
  })

  it('uses the available fallback when the preferred encode is unavailable', () => {
    expect(
      getHeroMediaPolicy({
        ...defaultPreferences,
        mobileViewport: true,
        supportedVariants: ['desktop'],
      }),
    ).toEqual({ mode: 'video', variant: 'desktop' })
  })

  it('stays poster-only when no video encode is available', () => {
    expect(
      getHeroMediaPolicy({ ...defaultPreferences, supportedVariants: [] }),
    ).toEqual({ mode: 'poster' })
  })
})
