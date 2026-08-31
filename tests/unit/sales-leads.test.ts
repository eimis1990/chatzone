import { describe, expect, it } from 'vitest'
import { formatStatusAge, matchesLeadCountry } from '@/lib/sales-leads'

describe('formatStatusAge', () => {
  const asOf = '2026-07-29T12:00:00.000Z'

  it('shows recent status changes without a zero-minute label', () => {
    expect(formatStatusAge('2026-07-29T11:59:30.000Z', asOf)).toBe('Just now')
  })

  it('shows singular and plural day ages numerically', () => {
    expect(formatStatusAge('2026-07-28T12:00:00.000Z', asOf)).toBe('1 day ago')
    expect(formatStatusAge('2026-07-24T12:00:00.000Z', asOf)).toBe('5 days ago')
  })

  it('does not display a negative age for clock skew', () => {
    expect(formatStatusAge('2026-07-29T12:01:00.000Z', asOf)).toBe('Just now')
  })

  it('handles invalid stored timestamps safely', () => {
    expect(formatStatusAge('not-a-date', asOf)).toBe('Unknown')
  })
})

describe('matchesLeadCountry', () => {
  it('keeps Lithuania matching case-insensitively', () => {
    expect(matchesLeadCountry('Lithuania', 'lithuania')).toBe(true)
    expect(matchesLeadCountry(' lithuania ', 'lithuania')).toBe(true)
    expect(matchesLeadCountry('Latvia', 'lithuania')).toBe(false)
  })

  it('groups every named non-Lithuanian country under Other', () => {
    expect(matchesLeadCountry('Latvia', 'other')).toBe(true)
    expect(matchesLeadCountry('Estonia', 'other')).toBe(true)
    expect(matchesLeadCountry('Lithuania', 'other')).toBe(false)
  })

  it('does not restrict the all-countries view', () => {
    expect(matchesLeadCountry('Finland', 'all')).toBe(true)
  })
})
