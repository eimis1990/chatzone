import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * SSRF guard for server-side fetches of user/tenant-supplied URLs.
 *
 * `assertPublicUrl` throws unless the URL is http(s) AND does not point at a
 * private, loopback, link-local, or otherwise-internal address. Hostnames are
 * DNS-resolved so a name that maps to an internal IP is rejected too. Call this
 * before fetching any URL that a user could control (crawl targets, ingestion
 * URLs, connected-store URLs, product feeds).
 *
 * Residual: this validates the target host, not redirect hops — callers that
 * follow untrusted redirects should also re-check the Location host.
 */
export class SsrfError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SsrfError'
  }
}

function ipv4Blocked(ip: string): boolean {
  const p = ip.split('.').map((n) => Number(n))
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true
  const [a, b] = p
  if (a === 0) return true // 0.0.0.0/8 "this host"
  if (a === 10) return true // 10.0.0.0/8 private
  if (a === 127) return true // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true // 192.168.0.0/16 private
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a >= 224) return true // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  return false
}

function ipv6Blocked(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, '')
  if (s === '::1' || s === '::') return true // loopback / unspecified
  if (s.startsWith('fe80')) return true // link-local
  if (s.startsWith('fc') || s.startsWith('fd')) return true // fc00::/7 unique-local
  const mapped = s.match(/(?:::ffff:)(\d+\.\d+\.\d+\.\d+)$/) // IPv4-mapped ::ffff:a.b.c.d
  if (mapped) return ipv4Blocked(mapped[1])
  return false
}

function ipBlocked(ip: string): boolean {
  const v = isIP(ip)
  if (v === 4) return ipv4Blocked(ip)
  if (v === 6) return ipv6Blocked(ip)
  return true // unclassifiable → block
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new SsrfError('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError('Only http(s) URLs are allowed')
  }
  const host = url.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new SsrfError('Internal host not allowed')
  }
  // Literal IP in the URL.
  if (isIP(host) && ipBlocked(host)) throw new SsrfError('Non-public IP not allowed')
  // Hostname → resolve and require every address to be public (defeats a name
  // that points at an internal IP).
  if (!isIP(host)) {
    let addrs: { address: string }[]
    try {
      addrs = await lookup(host, { all: true })
    } catch {
      throw new SsrfError('Host did not resolve')
    }
    if (!addrs.length || addrs.some((a) => ipBlocked(a.address))) {
      throw new SsrfError('Host resolves to a non-public address')
    }
  }
  return url
}
