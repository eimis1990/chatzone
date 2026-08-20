import { describe, expect, it } from 'vitest'
import { overConversationLimit } from '@/lib/usage'
import { entitlementsFor } from '@/lib/entitlements'

describe('overConversationLimit with top-up credits', () => {
  const freeLimit = entitlementsFor('free').conversations

  it('credits extend the plan pool', () => {
    expect(overConversationLimit(freeLimit, 'free')).toBe(true)
    expect(overConversationLimit(freeLimit, 'free', 1000)).toBe(false)
    expect(overConversationLimit(freeLimit + 1000, 'free', 1000)).toBe(true)
    expect(overConversationLimit(freeLimit + 999, 'free', 1000)).toBe(false)
  })

  it('negative or zero credits never lower the limit', () => {
    expect(overConversationLimit(freeLimit - 1, 'free', 0)).toBe(false)
    expect(overConversationLimit(freeLimit - 1, 'free', -500)).toBe(false)
    expect(overConversationLimit(freeLimit, 'free', -500)).toBe(true)
  })

  it('unlimited plans stay unlimited', () => {
    expect(overConversationLimit(1_000_000, 'enterprise', 0)).toBe(false)
  })
})
