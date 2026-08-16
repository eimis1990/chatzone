import { describe, it, expect } from 'vitest'
import {
  overageMinutesDelta,
  monthDateUTC,
  VOICE_INCLUDED_SECS,
  PREVIEW_VOICE_INCLUDED_SECS,
} from '@/lib/voice-usage'

describe('overageMinutesDelta — billable whole minutes crossed by one call', () => {
  const INC = 200 * 60

  it('entirely inside the included pool → 0', () => {
    expect(overageMinutesDelta(0, 600, INC)).toBe(0)
    expect(overageMinutesDelta(INC - 60, INC, INC)).toBe(0)
  })

  it('call crossing the boundary bills only the excess whole minutes', () => {
    expect(overageMinutesDelta(INC - 30, INC + 90, INC)).toBe(1) // 90s over → 1 whole min
  })

  it('fully in overage bills the delta in whole minutes (floor)', () => {
    expect(overageMinutesDelta(INC + 60, INC + 250, INC)).toBe(3) // floor(250/60)=4 − floor(60/60)=1
  })

  it('sub-minute progress bills nothing yet, then catches up', () => {
    expect(overageMinutesDelta(INC, INC + 59, INC)).toBe(0)
    expect(overageMinutesDelta(INC + 59, INC + 61, INC)).toBe(1)
  })

  it('never negative', () => {
    expect(overageMinutesDelta(INC + 120, INC + 120, INC)).toBe(0)
  })
})

describe('constants', () => {
  it('200 included live minutes, 30 preview minutes', () => {
    expect(VOICE_INCLUDED_SECS).toBe(12000)
    expect(PREVIEW_VOICE_INCLUDED_SECS).toBe(1800)
  })
})

describe('monthDateUTC', () => {
  it('returns the 1st of the current UTC month as a date string', () => {
    expect(monthDateUTC(new Date('2026-08-16T10:00:00Z'))).toBe('2026-08-01')
    expect(monthDateUTC(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01')
  })
})
