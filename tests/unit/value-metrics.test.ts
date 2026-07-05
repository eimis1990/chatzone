import { describe, it, expect } from 'vitest'
import { parsePriceToCents, isAfterHours, localHourAndDay } from '@/lib/analytics/value-metrics'

describe('parsePriceToCents', () => {
  it('parses Lithuanian comma-decimal prices', () => {
    expect(parsePriceToCents('3,99 €')).toBe(399)
    expect(parsePriceToCents('1 240,50 €')).toBe(124050)
  })

  it('parses dot-decimal prices', () => {
    expect(parsePriceToCents('€12.99')).toBe(1299)
    expect(parsePriceToCents('1,299.00')).toBe(129900)
  })

  it('treats a 3-digit trailing group as thousands, not decimals', () => {
    expect(parsePriceToCents('1.240')).toBe(124000)
    expect(parsePriceToCents('1,240')).toBe(124000)
  })

  it('handles whole numbers and single decimal digits', () => {
    expect(parsePriceToCents('45 €')).toBe(4500)
    expect(parsePriceToCents('4,5 €')).toBe(450)
  })

  it('returns null for junk', () => {
    expect(parsePriceToCents('')).toBeNull()
    expect(parsePriceToCents(null)).toBeNull()
    expect(parsePriceToCents(undefined)).toBeNull()
    expect(parsePriceToCents('kaina pagal užklausą')).toBeNull()
  })
})

describe('isAfterHours (Europe/Vilnius, default Mon–Fri 08:00–17:00)', () => {
  // 2026-07-06 is a Monday; Vilnius is UTC+3 in July.
  it('weekday inside business hours → false', () => {
    expect(isAfterHours('2026-07-06T07:00:00Z')).toBe(false) // 10:00 local Mon
    expect(isAfterHours('2026-07-06T13:59:00Z')).toBe(false) // 16:59 local Mon
    expect(isAfterHours('2026-07-06T05:30:00Z')).toBe(false) // 08:30 local Mon
  })

  it('weekday evening/early morning → true', () => {
    expect(isAfterHours('2026-07-06T14:00:00Z')).toBe(true) // 17:00 local Mon
    expect(isAfterHours('2026-07-06T04:30:00Z')).toBe(true) // 07:30 local Mon
  })

  it('weekend → true regardless of hour', () => {
    expect(isAfterHours('2026-07-05T09:00:00Z')).toBe(true) // Sunday noon local
    expect(isAfterHours('2026-07-04T08:00:00Z')).toBe(true) // Saturday 11:00 local
  })

  it('respects per-bot configured hours', () => {
    const hours = { start: '10:00', end: '20:00' }
    expect(isAfterHours('2026-07-06T06:30:00Z', hours)).toBe(true) // 09:30 local
    expect(isAfterHours('2026-07-06T16:30:00Z', hours)).toBe(false) // 19:30 local
  })

  it('localHourAndDay converts to Vilnius time', () => {
    expect(localHourAndDay('2026-07-06T07:15:00Z')).toEqual({ hour: 10, minutes: 615, weekday: 1 })
    // Winter (UTC+2): 2026-01-05 is a Monday.
    expect(localHourAndDay('2026-01-05T07:00:00Z')).toEqual({ hour: 9, minutes: 540, weekday: 1 })
  })
})
