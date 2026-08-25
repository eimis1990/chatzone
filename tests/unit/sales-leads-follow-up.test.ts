import { describe, it, expect } from 'vitest'
import { FOLLOW_UP_AFTER_DAYS, isContacted, needsFollowUp } from '@/lib/sales-leads'
import type { SalesLeadStatus } from '@/lib/types'

const NOW = '2026-07-31T12:00:00.000Z'
const daysAgo = (days: number) =>
  new Date(Date.parse(NOW) - days * 86_400_000).toISOString()

const lead = (status: SalesLeadStatus, days: number) => ({
  status,
  status_updated_at: daysAgo(days),
})

describe('needsFollowUp', () => {
  it('flags a first email left unanswered past the threshold', () => {
    expect(needsFollowUp(lead('email_sent', FOLLOW_UP_AFTER_DAYS), NOW)).toBe(true)
    expect(needsFollowUp(lead('email_sent', 40), NOW)).toBe(true)
  })

  it('leaves a recent email alone', () => {
    expect(needsFollowUp(lead('email_sent', 0), NOW)).toBe(false)
    expect(needsFollowUp(lead('email_sent', FOLLOW_UP_AFTER_DAYS - 1), NOW)).toBe(false)
  })

  it('only applies to email_sent — a nudge or progress clears it', () => {
    // Follow-up already sent, or the lead moved on: nothing to plan here.
    for (const status of [
      'ready',
      'follow_up_email',
      'wants_demo',
      'demo_ready',
      'demo_presented',
      'testing_bot',
      'client',
      'delivery_failed',
      'rejected',
    ] as SalesLeadStatus[]) {
      expect(needsFollowUp(lead(status, 90), NOW)).toBe(false)
    }
  })

  it('never flags on unparseable timestamps', () => {
    expect(needsFollowUp({ status: 'email_sent', status_updated_at: 'nonsense' }, NOW)).toBe(false)
    expect(needsFollowUp(lead('email_sent', 40), 'nonsense')).toBe(false)
  })
})

describe('isContacted', () => {
  it('excludes untouched and technically undeliverable leads', () => {
    expect(isContacted('ready')).toBe(false)
    expect(isContacted('delivery_failed')).toBe(false)
    for (const status of [
      'email_sent',
      'follow_up_email',
      'wants_demo',
      'demo_ready',
      'demo_presented',
      'testing_bot',
      'client',
      'rejected',
    ] as SalesLeadStatus[]) {
      expect(isContacted(status)).toBe(true)
    }
  })
})
