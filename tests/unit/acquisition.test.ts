import { beforeEach, describe, expect, it } from 'vitest'
import {
  FIRST_TOUCH_MAX_AGE_MS,
  captureFirstTouch,
  funnelProperties,
  isPublicMarketingPath,
} from '@/lib/acquisition'

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem'> {
  private values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  clear() {
    this.values.clear()
  }
}

describe('first-touch acquisition', () => {
  const storage = new MemoryStorage()
  beforeEach(() => storage.clear())

  it('classifies organic search without retaining sensitive query strings', () => {
    const context = captureFirstTouch({
      href: 'https://www.loqara.com/blog/ai-chatbot-for-ecommerce?ref=sidebar#answer',
      referrer: 'https://www.google.com/search?q=private+query',
      storage,
      now: Date.UTC(2026, 7, 26),
    })

    expect(context).toMatchObject({
      landingPath: '/blog/ai-chatbot-for-ecommerce',
      referrer: 'https://www.google.com/search',
      acquisitionSource: 'google',
      acquisitionMedium: 'organic',
      utmCampaign: '',
    })
    expect(JSON.stringify(context)).not.toContain('private')
    expect(JSON.stringify(context)).not.toContain('sidebar')
  })

  it('prefers explicit campaign parameters and preserves the first touch', () => {
    const first = captureFirstTouch({
      href: 'https://www.loqara.com/?utm_source=linkedin&utm_medium=social&utm_campaign=founder-post&utm_content=diagram',
      referrer: 'https://www.linkedin.com/feed/',
      storage,
      now: Date.UTC(2026, 7, 26),
    })
    const later = captureFirstTouch({
      href: 'https://www.loqara.com/pricing?utm_source=bing&utm_medium=cpc&utm_campaign=retargeting',
      referrer: 'https://www.bing.com/search?q=loqara',
      storage,
      now: Date.UTC(2026, 7, 27),
    })

    expect(first).toMatchObject({
      acquisitionSource: 'linkedin',
      acquisitionMedium: 'social',
      utmCampaign: 'founder-post',
      utmContent: 'diagram',
    })
    expect(later).toEqual(first)
  })

  it('starts a new first-touch window after the retention period', () => {
    captureFirstTouch({
      href: 'https://www.loqara.com/blog/old',
      referrer: '',
      storage,
      now: 1_000,
    })
    const replacement = captureFirstTouch({
      href: 'https://www.loqara.com/blog/new',
      referrer: 'https://www.bing.com/search?q=ai',
      storage,
      now: 1_000 + FIRST_TOUCH_MAX_AGE_MS + 1,
    })

    expect(replacement).toMatchObject({
      landingPath: '/blog/new',
      acquisitionSource: 'bing',
      acquisitionMedium: 'organic',
    })
  })

  it('produces the same bounded dimensions for every funnel event', () => {
    const context = captureFirstTouch({
      href: 'https://www.loqara.com/?utm_source=newsletter&utm_medium=email&utm_campaign=august',
      referrer: '',
      storage,
      now: Date.UTC(2026, 7, 26),
    })

    expect(funnelProperties('hero', context)).toEqual({
      ctaSource: 'hero',
      landingPath: '/',
      acquisitionSource: 'newsletter',
      acquisitionMedium: 'email',
      referrerHost: '',
      campaign: 'august',
    })
  })
})

describe('public analytics route boundary', () => {
  it('includes acquisition pages and excludes authenticated, owner, and embedded surfaces', () => {
    expect(isPublicMarketingPath('/')).toBe(true)
    expect(isPublicMarketingPath('/blog/example')).toBe(true)
    expect(isPublicMarketingPath('/about')).toBe(true)
    expect(isPublicMarketingPath('/app')).toBe(false)
    expect(isPublicMarketingPath('/owner/signups')).toBe(false)
    expect(isPublicMarketingPath('/embed/public-key')).toBe(false)
    expect(isPublicMarketingPath('/present/demo')).toBe(false)
    expect(isPublicMarketingPath('/login')).toBe(false)
  })
})
