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
 * Formats an ISO date string as YYYY-MM-DD.
 */
export function toDateString(isoString: string): string {
  return isoString.slice(0, 10)
}
