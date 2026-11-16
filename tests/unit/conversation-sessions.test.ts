import { describe, it, expect } from 'vitest'
import { startsNewUsageSession } from '@/lib/conversation-sessions'
describe('24-hour and UTC month usage sessions', () => {
  it('reuses an active session without resetting the thread', () => {
    expect(startsNewUsageSession('2026-11-15T12:00:00Z', new Date('2026-11-16T11:59:59Z'))).toBe(false)
  })
  it('starts again at exactly 24 hours inactivity', () => {
    expect(startsNewUsageSession('2026-11-15T12:00:00Z', new Date('2026-11-16T12:00:00Z'))).toBe(true)
  })
  it('starts in a new UTC month even with recent activity', () => {
    expect(startsNewUsageSession('2026-11-30T23:59:59Z', new Date('2026-12-01T00:00:00Z'))).toBe(true)
    expect(startsNewUsageSession('2026-12-31T23:59:59Z', new Date('2027-01-01T00:00:00Z'))).toBe(true)
  })
  it('does not use the browser/local month boundary', () => {
    expect(startsNewUsageSession('2026-11-30T23:59:59+02:00', new Date('2026-12-01T00:00:01+02:00'))).toBe(false)
  })
  it('starts for a new or invalid activity timestamp', () => {
    expect(startsNewUsageSession(null)).toBe(true)
    expect(startsNewUsageSession('invalid')).toBe(true)
  })
})
