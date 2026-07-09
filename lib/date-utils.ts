/**
 * Minimal date formatting helpers — no external dependency required.
 * These run both server-side (RSC) and client-side.
 */

/**
 * Returns a human-readable relative time string, e.g. "3 days ago".
 * Falls back to the locale date string when the date is > 30 days old.
 */
export function formatDistanceToNow(isoString: string): string {
  const date = new Date(isoString)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHrs < 24) return `${diffHrs}h ago`
  if (diffDays < 30) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Human-readable time UNTIL a future date, e.g. "in 6 days" / "in 3 hours".
 * Returns "expired" for a past date. (formatDistanceToNow only handles the
 * past, so it wrongly reports future dates as "just now".)
 */
export function formatTimeUntil(isoString: string): string {
  const diffMs = new Date(isoString).getTime() - Date.now()
  if (diffMs <= 0) return 'expired'
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  // Round days so a fresh 7-day invite reads "in 7 days", not "in 6".
  const diffDays = Math.round(diffHrs / 24)

  if (diffMin < 60) return 'in under an hour'
  if (diffHrs < 24) return `in ${diffHrs} ${diffHrs === 1 ? 'hour' : 'hours'}`
  return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
}

/**
 * Formats an ISO date string as YYYY-MM-DD.
 */
export function toDateString(isoString: string): string {
  return isoString.slice(0, 10)
}
