import type { SalesLead, SalesLeadStatus } from '@/lib/types'

export type SalesLeadCountryFilter = 'all' | 'lithuania' | 'other'

/** Days an unanswered first email may sit before it needs a follow-up. */
export const FOLLOW_UP_AFTER_DAYS = 14

/** LinkedIn leads use a deliberately coarse Lithuania/rest-of-world switch. */
export function matchesLeadCountry(
  country: string,
  filter: SalesLeadCountryFilter,
): boolean {
  if (filter === 'all') return true
  const isLithuania = country.trim().toLocaleLowerCase('en') === 'lithuania'
  return filter === 'lithuania' ? isLithuania : !isLithuania
}

/**
 * A first email that has gone unanswered long enough to warrant a follow-up —
 * still on `email_sent` (not nudged, not progressed) past the threshold. The
 * pipeline table tints these rows so they stand out for planning.
 */
export function needsFollowUp(
  lead: Pick<SalesLead, 'status' | 'status_updated_at'>,
  asOf: string,
): boolean {
  if (lead.status !== 'email_sent') return false
  const sentAt = Date.parse(lead.status_updated_at)
  const reference = Date.parse(asOf)
  if (!Number.isFinite(sentAt) || !Number.isFinite(reference)) return false
  return reference - sentAt >= FOLLOW_UP_AFTER_DAYS * 86_400_000
}

/**
 * Whether the prospect was actually reached. A delivery failure records an
 * attempted send, but it must not inflate contacted or awaiting-reply metrics.
 */
export function isContacted(status: SalesLeadStatus): boolean {
  return status !== 'ready' && status !== 'delivery_failed'
}

const RELATIVE_UNITS = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
] as const

/** Format a stable, compact age for an owner-pipeline status change. */
export function formatStatusAge(statusUpdatedAt: string, asOf: string): string {
  const timestamp = Date.parse(statusUpdatedAt)
  const reference = Date.parse(asOf)
  if (!Number.isFinite(timestamp) || !Number.isFinite(reference)) return 'Unknown'

  const elapsedSeconds = Math.max(0, Math.floor((reference - timestamp) / 1_000))
  if (elapsedSeconds < 60) return 'Just now'

  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (elapsedSeconds >= seconds) {
      const value = Math.floor(elapsedSeconds / seconds)
      return new Intl.RelativeTimeFormat('en', { numeric: 'always' }).format(-value, unit)
    }
  }

  return 'Just now'
}
