/** "my-store.com" → "https://my-store.com"; leaves proper URLs (and blanks) alone. */
export function normalizeWebsite(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * True for a web address with a real-looking host ("store.lt", not "store" or
 * "n/a"). Shared by the signup dialog and `/api/signup`, which both require one.
 */
export function isWebsite(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(normalizeWebsite(raw))
    // The last label must hold a letter, which rules out bare IP addresses.
    return (
      /^https?:$/.test(protocol) &&
      /^[^\s.]+(\.[^\s.]+)*\.(?=[^.]*\p{L})[\p{L}\d-]{2,}$/u.test(hostname)
    )
  } catch {
    return false
  }
}
