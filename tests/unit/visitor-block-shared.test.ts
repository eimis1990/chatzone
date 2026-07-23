import { describe, expect, it } from 'vitest'
import { extendVisitorBlockExpiry } from '@/lib/visitor-block-shared'

describe('extendVisitorBlockExpiry', () => {
  it('adds 24 hours on top of the time remaining', () => {
    expect(
      extendVisitorBlockExpiry(
        '2026-07-24T18:41:40.952Z',
        new Date('2026-07-23T18:41:40.952Z'),
      ),
    ).toBe('2026-07-25T18:41:40.952Z')
  })

  it('starts a fresh 24 hours when the stored expiry is already past', () => {
    expect(
      extendVisitorBlockExpiry(
        '2026-07-22T18:41:40.952Z',
        new Date('2026-07-23T18:41:40.952Z'),
      ),
    ).toBe('2026-07-24T18:41:40.952Z')
  })
})
