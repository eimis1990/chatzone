import { describe, it, expect } from 'vitest'
import { overConversationLimit, monthStartISO } from '@/lib/usage'

describe('overConversationLimit — hard-block math', () => {
  it('Free (100): blocks at and above the limit, allows below', () => {
    expect(overConversationLimit(99, 'free')).toBe(false)
    expect(overConversationLimit(100, 'free')).toBe(true)
    expect(overConversationLimit(250, 'free')).toBe(true)
  })

  it('Starter (1,500): blocks at the limit', () => {
    expect(overConversationLimit(1499, 'starter')).toBe(false)
    expect(overConversationLimit(1500, 'starter')).toBe(true)
  })

  it('Scale (12,000): blocks at the limit', () => {
    expect(overConversationLimit(11999, 'scale')).toBe(false)
    expect(overConversationLimit(12000, 'scale')).toBe(true)
  })

  it('Enterprise (unlimited): never blocks', () => {
    expect(overConversationLimit(1_000_000, 'enterprise')).toBe(false)
  })

  it('null/undefined plan is treated as Free', () => {
    expect(overConversationLimit(100, null)).toBe(true)
    expect(overConversationLimit(50, undefined)).toBe(false)
  })
})

describe('monthStartISO', () => {
  it('returns the 1st of the month at UTC midnight', () => {
    expect(monthStartISO(new Date('2026-06-26T12:34:56Z'))).toBe('2026-06-01T00:00:00.000Z')
    expect(monthStartISO(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T00:00:00.000Z')
  })
})
