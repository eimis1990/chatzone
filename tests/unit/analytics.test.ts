import { beforeEach, describe, expect, it, vi } from 'vitest'

const { vercelTrack } = vi.hoisted(() => ({ vercelTrack: vi.fn() }))

vi.mock('@vercel/analytics', () => ({ track: vercelTrack }))

import { trackEvent } from '@/lib/analytics'

describe('trackEvent', () => {
  beforeEach(() => {
    vercelTrack.mockReset()
    window.gtag = vi.fn()
  })

  it('sends the same typed funnel event to Vercel and GA4', () => {
    const properties = {
      ctaSource: 'hero',
      landingPath: '/blog/example',
      acquisitionSource: 'google',
      acquisitionMedium: 'organic',
      referrerHost: 'www.google.com',
      campaign: '',
    }

    trackEvent('get_started_cta_clicked', properties)

    expect(vercelTrack).toHaveBeenCalledWith('get_started_cta_clicked', properties)
    expect(window.gtag).toHaveBeenCalledWith('event', 'get_started_cta_clicked', properties)
  })
})
