import { describe, expect, it } from 'vitest'
import {
  DEMO_SHARE_TOKEN_BYTES,
  DEMO_SHARE_TTL_MS,
  demoShareExpiresAt,
  generateDemoShareToken,
  hashDemoShareToken,
  isDemoShareToken,
} from '@/lib/demo-share-token'

describe('demo presentation share tokens', () => {
  it('generates unique 256-bit URL-safe bearer tokens', () => {
    const first = generateDemoShareToken()
    const second = generateDemoShareToken()

    expect(DEMO_SHARE_TOKEN_BYTES).toBe(32)
    expect(first).not.toBe(second)
    expect(isDemoShareToken(first)).toBe(true)
    expect(isDemoShareToken(second)).toBe(true)
  })

  it('rejects malformed tokens before database lookup', () => {
    expect(isDemoShareToken('')).toBe(false)
    expect(isDemoShareToken('short')).toBe(false)
    expect(isDemoShareToken('a'.repeat(42))).toBe(false)
    expect(isDemoShareToken(`${'a'.repeat(42)}!`)).toBe(false)
  })

  it('hashes tokens with SHA-256', () => {
    expect(hashDemoShareToken('test')).toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    )
  })

  it('expires links exactly 24 hours after creation', () => {
    const now = new Date('2026-08-03T12:00:00.000Z')
    const expiry = demoShareExpiresAt(now)

    expect(DEMO_SHARE_TTL_MS).toBe(86_400_000)
    expect(expiry.toISOString()).toBe('2026-08-04T12:00:00.000Z')
  })
})
