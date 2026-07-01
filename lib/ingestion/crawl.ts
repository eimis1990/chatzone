/**
 * Discovers the pages of a website for "train on the whole site". Prefers the
 * site's sitemap.xml (fast, complete); falls back to following same-origin links
 * from the given page. Stays on the same origin, skips asset URLs, dedupes, and
 * caps the result. Pure aside from the injected `fetch`, so it's unit-testable.
 */

// Non-HTML assets we never want to ingest as "pages".
const ASSET_RE =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|rss|pdf|zip|gz|tar|mp4|webm|mp3|wav|woff2?|ttf|eot|map)(\?|$)/i

const LOC_RE = /<loc>\s*([^<\s]+)\s*<\/loc>/gi
const HREF_RE = /href\s*=\s*["']([^"'#]+)["']/gi

function isLikelyPage(u: URL): boolean {
  return !ASSET_RE.test(u.pathname)
}

function stripHash(u: URL): string {
  u.hash = ''
  return u.toString()
}

// Common sitemap locations to probe when robots.txt doesn't declare one.
const COMMON_SITEMAPS = [
  '/sitemap.xml',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
  '/wp-sitemap.xml',
  '/sitemap/sitemap.xml',
]

const sameOriginAs =
  (origin: string) =>
  (u: string): boolean => {
    try {
      return new URL(u, origin).origin === origin
    } catch {
      return false
    }
  }

/** Sitemap URLs to try: those declared in robots.txt (same-origin) + common paths. */
async function sitemapCandidates(origin: string, fetchImpl: typeof fetch): Promise<string[]> {
  const same = sameOriginAs(origin)
  const set = new Set<string>()
  try {
    const res = await fetchImpl(`${origin}/robots.txt`)
    if (res.ok) {
      const txt = await res.text()
      for (const m of txt.matchAll(/^\s*sitemap:\s*(\S+)/gim)) {
        if (same(m[1])) set.add(new URL(m[1], origin).toString())
      }
    }
  } catch {
    // no robots.txt — fall back to common paths
  }
  for (const p of COMMON_SITEMAPS) set.add(`${origin}${p}`)
  return [...set]
}

/** Collect page URLs from a sitemap, expanding one level of same-origin sitemap-index. */
async function collectFromSitemap(
  sitemapUrl: string,
  origin: string,
  fetchImpl: typeof fetch,
): Promise<string[]> {
  const out: string[] = []
  const same = sameOriginAs(origin)
  try {
    const res = await fetchImpl(sitemapUrl)
    if (!res.ok) return out
    const xml = await res.text()
    const locs = [...xml.matchAll(LOC_RE)].map((m) => m[1])
    // Only follow child sitemaps on the SAME origin (avoids SSRF + off-site).
    const childSitemaps = locs.filter((u) => /\.xml(\?|$)/i.test(u) && same(u))
    out.push(...locs.filter((u) => !/\.xml(\?|$)/i.test(u)))

    for (const sm of childSitemaps.slice(0, 10)) {
      try {
        const r = await fetchImpl(sm)
        if (!r.ok) continue
        const x = await r.text()
        out.push(...[...x.matchAll(LOC_RE)].map((m) => m[1]).filter((u) => !/\.xml(\?|$)/i.test(u)))
      } catch {
        // skip a bad child sitemap
      }
    }
  } catch {
    // this candidate sitemap didn't load — try the next
  }
  return out
}

function extractLinks(html: string): string[] {
  return [...html.matchAll(HREF_RE)].map((m) => m[1])
}

export async function discoverPages(
  baseUrl: string,
  maxPages: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string[]> {
  let base: URL
  try {
    base = new URL(baseUrl)
  } catch {
    return []
  }
  const origin = base.origin
  const seen = new Set<string>()
  const pages: string[] = []

  const add = (raw: string): void => {
    if (pages.length >= maxPages) return
    let u: URL
    try {
      u = new URL(raw, origin)
    } catch {
      return
    }
    if (u.origin !== origin || !isLikelyPage(u)) return
    const key = stripHash(u)
    if (seen.has(key)) return
    seen.add(key)
    pages.push(key)
  }

  // 1) Sitemaps (preferred) — from robots.txt + common locations.
  for (const sitemapUrl of await sitemapCandidates(origin, fetchImpl)) {
    for (const u of await collectFromSitemap(sitemapUrl, origin, fetchImpl)) {
      add(u)
      if (pages.length >= maxPages) break
    }
    if (pages.length >= maxPages) break
  }

  // 2) Fallback: follow same-origin links from the base page.
  if (pages.length === 0) {
    add(base.toString())
    try {
      const res = await fetchImpl(base.toString())
      const ctype = res.headers.get('content-type') ?? ''
      if (res.ok && (ctype.includes('html') || ctype === '')) {
        for (const href of extractLinks(await res.text())) {
          add(href)
          if (pages.length >= maxPages) break
        }
      }
    } catch {
      // ignore — we'll at least return the base page
    }
  }

  // Always include the base page itself.
  add(base.toString())

  return pages.slice(0, maxPages)
}
