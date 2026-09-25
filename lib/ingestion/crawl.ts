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

/** Host without a leading `www.` — www and apex are the same site. */
const bareHost = (host: string): string => host.replace(/^www\./i, '').toLowerCase()

// www and apex count as one site: stogai-dzukijoje.lt's robots.txt + sitemap list
// apex URLs while the bot was crawled on www, so every sitemap page was rejected
// as cross-origin and discovery fell back to scraping links (2 of 11 pages).
const sameOriginAs =
  (origin: string) =>
  (u: string): boolean => {
    try {
      const x = new URL(u, origin)
      const o = new URL(origin)
      return x.protocol.startsWith('http') && bareHost(x.host) === bareHost(o.host)
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
    if (!sameOriginAs(origin)(u.toString()) || !isLikelyPage(u)) return
    // Normalise www/apex (and http/https) to the base origin so keys dedupe.
    if (u.origin !== origin) u = new URL(u.pathname + u.search, origin)
    const key = stripHash(u)
    if (seen.has(key)) return
    seen.add(key)
    pages.push(key)
  }

  // The base page is seeded FIRST: adding it after the sitemap loop silently
  // dropped it whenever the sitemap alone filled maxPages.
  add(base.toString())

  // 1) Sitemaps (preferred) — from robots.txt + common locations.
  for (const sitemapUrl of await sitemapCandidates(origin, fetchImpl)) {
    for (const u of await collectFromSitemap(sitemapUrl, origin, fetchImpl)) {
      add(u)
      if (pages.length >= maxPages) break
    }
    if (pages.length >= maxPages) break
  }

  // 2) Fallback: follow same-origin links from the base page (only the seeded
  // base present means no sitemap yielded anything).
  if (pages.length <= 1) {
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

  return pages.slice(0, maxPages)
}

// --- Shared by the crawl + sync routes -------------------------------------

// Pages most support questions hit — contact, returns/refunds, terms, privacy,
// shipping/delivery, payment, warranty, about, FAQ, plus service-business core
// pages: rentals/pricing/accommodation/services (Lithuanian + English). These
// are ingested first so a single crawl front-loads the highest-value info.
const PRIORITY_RE =
  /(kontakt|contact|susisiek|gr[aą]žin|grazin|return|refund|atsisak|taisykl|s[aą]lyg|salyg|terms|conditions|privatum|privacy|gdpr|slapuk|cookie|pristatym|siunt|delivery|shipping|apmok|mok[eė]jim|payment|garantij|warranty|apie|about|duk|faq|klausim|nuoma|rent|kain|pric|paslaug|service|apgyvendin|accommodation|pramog|edukacij|menu|meniu)/i
// Dated/low-value posts go last: blogs, news, and event announcements (event
// calendars churn; a crawl full of expired events answers nothing).
const BLOG_RE =
  /\/(patarimai|blog|straipsn|news|tinklarast|article|renginiai|renginys|events?|wydarzenia|veranstaltungen|notikumi|kategorija|category|author)\//i

/** Rank a page for ingestion priority: policy/contact pages first, blogs last. */
export function priorityScore(u: string): number {
  try {
    const path = new URL(u).pathname.toLowerCase()
    if (path === '/' || path === '') return 3 // homepage: general store info
    // A dated/low-value section always ranks last, even when its slug happens
    // to contain a priority word (e.g. /renginiai/vasaros-pramogos-…/).
    if (BLOG_RE.test(path)) return -1
    return PRIORITY_RE.test(path) ? 5 : 0
  } catch {
    return 0
  }
}

// Product & category pages are served by the live store feed (always-current
// prices + stock), so we do NOT ingest them into the knowledge base — that would
// duplicate the catalog and, worse, freeze prices at crawl time. We crawl only
// content pages (policies, FAQ, about, blog). Covers WooCommerce (LT + EN).
const PRODUCT_URL_RE =
  /\/(produktas|produkto-kategorija|product|product-category|shop|store|parduotuv|prek[eė])\//i
export function isProductUrl(u: string): boolean {
  try {
    return PRODUCT_URL_RE.test(new URL(u).pathname.toLowerCase())
  } catch {
    return false
  }
}

/** Derive a short, readable source name from a page URL (its path, else host). */
export function pageName(u: string): string {
  try {
    const x = new URL(u)
    const path = x.pathname.replace(/\/+$/, '')
    return path || x.hostname
  } catch {
    return u
  }
}

/** Identity of a page across www/apex, http/https and a trailing slash. */
export function pageKey(u: string): string {
  try {
    const x = new URL(u)
    return bareHost(x.host) + (x.pathname.replace(/\/+$/, '') || '/') + x.search
  } catch {
    return u
  }
}
