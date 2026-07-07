import { describe, it, expect } from 'vitest'
import { isOriginAllowed, originHost, allowedDomainToHost } from '@/lib/widget-auth'
import { SITE_URL } from '@/lib/site'

describe('allowedDomainToHost', () => {
  it('normalizes full URLs, www, paths and ports to a bare host', () => {
    expect(allowedDomainToHost('https://www.loqara.com/')).toBe('loqara.com')
    expect(allowedDomainToHost('http://acme.lt/embed?x=1')).toBe('acme.lt')
    expect(allowedDomainToHost('www.acme.lt')).toBe('acme.lt')
    expect(allowedDomainToHost('acme.lt:3000/path')).toBe('acme.lt')
    expect(allowedDomainToHost('  ACME.LT  ')).toBe('acme.lt')
  })
  it('returns null for empty entries', () => {
    expect(allowedDomainToHost('')).toBeNull()
    expect(allowedDomainToHost('   ')).toBeNull()
  })
})

describe('originHost', () => {
  it('extracts the host from an origin', () => {
    expect(originHost('https://www.acme.com')).toBe('acme.com')
    expect(originHost('http://acme.com:3000')).toBe('acme.com')
  })
  it('returns null for junk', () => {
    expect(originHost(null)).toBeNull()
    expect(originHost('not a url')).toBeNull()
  })
})

describe('isOriginAllowed', () => {
  it('allows any origin when no domains are configured', () => {
    expect(isOriginAllowed('https://anything.com', [])).toBe(true)
  })

  it('allows a listed host (www-insensitive)', () => {
    expect(isOriginAllowed('https://acme.com', ['acme.com'])).toBe(true)
    expect(isOriginAllowed('https://www.acme.com', ['acme.com'])).toBe(true)
    expect(isOriginAllowed('https://acme.com', ['www.acme.com'])).toBe(true)
  })

  it('matches even when the domain was entered as a full URL (regression)', () => {
    // The Configure field lets users paste a full URL; it must still match the
    // bare origin host rather than silently blocking the widget.
    expect(isOriginAllowed('https://www.loqara.com', ['https://www.loqara.com/'])).toBe(true)
    expect(isOriginAllowed('https://loqara.com', ['https://www.loqara.com/'])).toBe(true)
  })

  it('rejects an unlisted host', () => {
    expect(isOriginAllowed('https://evil.com', ['acme.com'])).toBe(false)
  })

  it('allows a null origin — the widget’s own embed fetches config same-origin, so the browser sends no Origin header', () => {
    // First-party: the iframe (served by this app) fetches /api/widget-config
    // same-origin; a same-origin GET carries no Origin header. Blocking it broke
    // every bot that had restricted its domains.
    expect(isOriginAllowed(null, ['acme.com'])).toBe(true)
  })

  it('allows the app’s own origin regardless of allowlist (first-party embed POSTs)', () => {
    // The embed iframe’s same-origin POSTs (chat, actions) send the app host as
    // Origin; those must pass whatever the customer’s domain allowlist is.
    expect(isOriginAllowed(SITE_URL, ['acme.com'])).toBe(true)
  })

  it('still rejects a third-party browser origin not in the allowlist', () => {
    expect(isOriginAllowed('https://evil.com', ['acme.com'])).toBe(false)
  })
})
