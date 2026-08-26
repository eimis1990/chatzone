/**
 * Privacy-bounded, first-touch acquisition context for the public marketing
 * funnel. We retain only the landing pathname, a referrer without query/hash,
 * and explicit UTM dimensions. Search terms and arbitrary URL parameters are
 * deliberately excluded.
 */

export const FIRST_TOUCH_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000
const STORAGE_KEY = 'loqara:first-touch:v1'
const VALUE_LIMIT = 160

export interface AcquisitionContext {
  landingPath: string
  referrer: string
  acquisitionSource: string
  acquisitionMedium: string
  utmCampaign: string
  utmContent: string
  capturedAt: string
}

export interface FunnelProperties {
  ctaSource: string
  landingPath: string
  acquisitionSource: string
  acquisitionMedium: string
  referrerHost: string
  campaign: string
}

interface CaptureInput {
  href?: string
  referrer?: string
  storage?: Pick<Storage, 'getItem' | 'setItem'>
  now?: number
}

const exactOrNested = (pathname: string, root: string) =>
  pathname === root || pathname.startsWith(`${root}/`)

/** Keep acquisition analytics off authenticated, owner, embed, and demo routes. */
export function isPublicMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false
  if (pathname === '/') return true
  return [
    '/about',
    '/authors',
    '/blog',
    '/editorial-policy',
    '/privacy',
    '/review-methodology',
    '/terms',
  ].some((root) => exactOrNested(pathname, root))
}

function bounded(value: string | null | undefined): string {
  return (value ?? '').trim().slice(0, VALUE_LIMIT)
}

function safeUrl(raw: string, base?: string): URL | null {
  try {
    return new URL(raw, base)
  } catch {
    return null
  }
}

function normalizedExternalReferrer(referrer: string, landing: URL): { url: string; host: string } {
  const parsed = safeUrl(referrer)
  if (!parsed || parsed.origin === landing.origin) return { url: '', host: '' }
  return {
    url: bounded(`${parsed.origin}${parsed.pathname}`),
    host: parsed.hostname.toLowerCase(),
  }
}

function classifyReferrer(host: string): { source: string; medium: string } {
  if (!host) return { source: 'direct', medium: 'none' }
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return { source: 'google', medium: 'organic' }
  if (/(^|\.)bing\.com$/.test(host)) return { source: 'bing', medium: 'organic' }
  if (/(^|\.)duckduckgo\.com$/.test(host)) return { source: 'duckduckgo', medium: 'organic' }
  if (/(^|\.)search\.brave\.com$/.test(host)) return { source: 'brave', medium: 'organic' }
  if (/(^|\.)ecosia\.org$/.test(host)) return { source: 'ecosia', medium: 'organic' }
  if (/(^|\.)yahoo\.[a-z.]+$/.test(host)) return { source: 'yahoo', medium: 'organic' }
  if (/(^|\.)(chatgpt\.com|chat\.openai\.com|perplexity\.ai|claude\.ai|copilot\.microsoft\.com|gemini\.google\.com)$/.test(host)) {
    return { source: host.replace(/^www\./, ''), medium: 'ai_referral' }
  }
  return { source: host.replace(/^www\./, ''), medium: 'referral' }
}

function validStoredContext(value: unknown, now: number): AcquisitionContext | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<AcquisitionContext>
  const fields: (keyof AcquisitionContext)[] = [
    'landingPath',
    'referrer',
    'acquisitionSource',
    'acquisitionMedium',
    'utmCampaign',
    'utmContent',
    'capturedAt',
  ]
  if (!fields.every((field) => typeof candidate[field] === 'string')) return null
  const captured = Date.parse(candidate.capturedAt as string)
  if (!Number.isFinite(captured) || captured > now || now - captured > FIRST_TOUCH_MAX_AGE_MS) {
    return null
  }
  return candidate as AcquisitionContext
}

/** Read or create the 90-day first-touch record without ever blocking the UI. */
export function captureFirstTouch(input: CaptureInput = {}): AcquisitionContext {
  const now = input.now ?? Date.now()
  const browser = typeof window !== 'undefined' ? window : null
  const storage = input.storage ?? browser?.localStorage

  if (storage) {
    try {
      const existing = validStoredContext(JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null'), now)
      if (existing) return existing
    } catch {
      // Storage can be blocked or contain malformed legacy data; recapture below.
    }
  }

  const href = input.href ?? browser?.location.href ?? 'https://www.loqara.com/'
  const landing = safeUrl(href, 'https://www.loqara.com/') ?? new URL('https://www.loqara.com/')
  const { url: referrer, host } = normalizedExternalReferrer(
    input.referrer ?? (typeof document !== 'undefined' ? document.referrer : ''),
    landing,
  )
  const classified = classifyReferrer(host)
  const utmSource = bounded(landing.searchParams.get('utm_source'))
  const utmMedium = bounded(landing.searchParams.get('utm_medium'))
  const context: AcquisitionContext = {
    landingPath: bounded(landing.pathname || '/'),
    referrer,
    acquisitionSource: utmSource || classified.source,
    acquisitionMedium: utmMedium || (utmSource ? 'campaign' : classified.medium),
    utmCampaign: bounded(landing.searchParams.get('utm_campaign')),
    utmContent: bounded(landing.searchParams.get('utm_content')),
    capturedAt: new Date(now).toISOString(),
  }

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(context))
    } catch {
      // Safari private mode and privacy extensions may reject storage writes.
    }
  }
  return context
}

export function funnelProperties(
  ctaSource: string,
  context = captureFirstTouch(),
): FunnelProperties {
  return {
    ctaSource: bounded(ctaSource),
    landingPath: context.landingPath,
    acquisitionSource: context.acquisitionSource,
    acquisitionMedium: context.acquisitionMedium,
    referrerHost: safeUrl(context.referrer)?.hostname ?? '',
    campaign: context.utmCampaign,
  }
}
