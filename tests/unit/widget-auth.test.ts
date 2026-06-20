import { describe, it, expect } from 'vitest'
import { isOriginAllowed, originHost } from '@/lib/widget-auth'

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

  it('rejects an unlisted host', () => {
    expect(isOriginAllowed('https://evil.com', ['acme.com'])).toBe(false)
  })

  it('rejects a null origin when domains are configured', () => {
    expect(isOriginAllowed(null, ['acme.com'])).toBe(false)
  })
})
