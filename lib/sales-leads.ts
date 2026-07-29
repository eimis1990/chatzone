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
