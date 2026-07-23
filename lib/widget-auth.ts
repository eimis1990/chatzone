import { SITE_URL } from '@/lib/site'

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
 * Reduce a stored allowed-domain entry to a bare host for comparison. Accepts
 * whatever a user typed into the Configure field: a bare host ("acme.lt"), a
 * host with www, or a full URL with scheme/path/port ("https://www.acme.lt/").
 * Without this, a pasted full URL would never match the bare origin host and
 * the allowlist would silently block the bot's own widget.
 */
export function allowedDomainToHost(entry: string): string | null {
  const raw = (entry || '').trim().toLowerCase()
  if (!raw) return null
  let host = raw
  if (raw.includes('://')) {
    try {
      host = new URL(raw).hostname
    } catch {
      return null
    }
  } else {
    // Bare entry — drop any path, port, or query the user may have included.
    host = raw.split('/')[0].split('?')[0].split(':')[0]
  }
  host = host.replace(/^www\./, '')
  return host || null
}

/**
 * Whether a request origin is allowed for a bot. An empty allowlist means the
 * bot has not restricted domains yet, so all origins are permitted (useful
 * during setup); once domains are listed, the origin host must match one of
 * them (www-insensitive, scheme/path-insensitive).
 */
export function isOriginAllowed(origin: string | null, allowedDomains: string[]): boolean {
  const host = originHost(origin)
  // First-party requests from the widget's OWN embed (served by this app) must
  // always pass: the iframe fetches config same-origin (a GET with no Origin
  // header → host null) and its POSTs send this app's own host. The
  // customer-domain allowlist governs THIRD-PARTY parent sites embedding via
  // widget.js — those always carry a cross-origin Origin header.
  if (!host || host === originHost(SITE_URL)) return true
  if (allowedDomains.length === 0) return true
  return allowedDomains.some((d) => allowedDomainToHost(d) === host)
}

/** CORS headers permitting the given origin (or any during setup). */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers':
      'X-Conversation-Id, X-Handoff, X-Lead-Capture, X-Visitor-Blocked-Until',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}
