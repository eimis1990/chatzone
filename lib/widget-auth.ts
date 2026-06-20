/** Extracts the bare host (without a leading www.) from an Origin header. */
export function originHost(origin: string | null): string | null {
  if (!origin) return null
  try {
    const host = new URL(origin).hostname.toLowerCase()
    return host.replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Whether a request origin is allowed for a bot. An empty allowlist means the
 * bot has not restricted domains yet, so all origins are permitted (useful
 * during setup); once domains are listed, the origin host must match one of
 * them (www-insensitive).
 */
export function isOriginAllowed(origin: string | null, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true
  const host = originHost(origin)
  if (!host) return false
  const normalized = allowedDomains.map((d) => d.toLowerCase().replace(/^www\./, ''))
  return normalized.includes(host)
}

/** CORS headers permitting the given origin (or any during setup). */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
