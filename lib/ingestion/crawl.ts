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

/** Collect page URLs from sitemap.xml, expanding one level of sitemap-index. */
async function collectFromSitemap(origin: string, fetchImpl: typeof fetch): Promise<string[]> {
  const out: string[] = []
  try {
    const res = await fetchImpl(`${origin}/sitemap.xml`)
    if (!res.ok) return out
    const xml = await res.text()
    const locs = [...xml.matchAll(LOC_RE)].map((m) => m[1])
    // Only follow child sitemaps on the SAME origin — a sitemap must not send
    // the crawler to an arbitrary (possibly internal) host.
    const sameOrigin = (u: string): boolean => {
      try {
        return new URL(u, origin).origin === origin
      } catch {
        return false
      }
    }
    const childSitemaps = locs.filter((u) => /\.xml(\?|$)/i.test(u) && sameOrigin(u))
    out.push(...locs.filter((u) => !/\.xml(\?|$)/i.test(u)))

    for (const sm of childSitemaps.slice(0, 5)) {
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
    // no sitemap / fetch error → fall back to link-following
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

  // 1) Sitemap (preferred).
  for (const u of await collectFromSitemap(origin, fetchImpl)) {
    add(u)
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
