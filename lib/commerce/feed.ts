/**
 * Product-feed connector. Fetches an owner-configured feed URL and maps it into
 * product cards. Tolerant by design — handles JSON, XML (RSS / Google Shopping /
 * Atom) and CSV, matching common field names so most feeds work without config.
 *
 * Used both as the "feed" commerce provider (live catalog search for stores
 * whose API isn't reachable, e.g. locked-down Magento) and the legacy
 * "fetch URL" quick action. The URL is always owner-configured (never
 * visitor-supplied); we still guard with http(s)-only, a timeout, and a size cap.
 */
import type { CommerceProduct, ProductSearchParams, CommerceDeps } from './types'

const TIMEOUT_MS = 8000
const QUICK_MAX_BYTES = 1_500_000
const FEED_MAX_BYTES = 4_000_000
const DEFAULT_LIMIT = 12

type Raw = Record<string, unknown>

// Field-name aliases (local names — XML namespace prefixes like `g:` are stripped).
const KEYS = {
  title: ['title', 'name', 'product_title', 'productname', 'displayname'],
  price: ['price', 'sale_price', 'price_str', 'displayprice', 'priceformatted', 'min_price', 'amount'],
  url: ['url', 'link', 'permalink', 'href', 'product_url', 'producturl'],
  image: ['imageurl', 'image', 'image_link', 'featured_image', 'thumbnail', 'img', 'image_url', 'picture', 'images'],
  id: ['id', 'sku', 'handle', 'productid', 'product_id', 'variant_id'],
  inStock: ['instock', 'in_stock', 'availability', 'available'],
  desc: ['shortdescription', 'short_description', 'description', 'summary', 'subtitle'],
}

function pick(obj: Raw, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}

function asImageUrl(v: unknown): string | undefined {
  if (!v) return undefined
  if (typeof v === 'string') return v
  if (Array.isArray(v)) return asImageUrl(v[0])
  if (typeof v === 'object') {
    const o = v as Raw
    return asImageUrl(o.src ?? o.url ?? o.href ?? o.original ?? o.thumbnail)
  }
  return undefined
}

function asPrice(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return `${v.toFixed(2)} €`
  const s = String(v).trim()
  if (/^\d+([.,]\d+)?$/.test(s)) return `${Number(s.replace(',', '.')).toFixed(2)} €`
  return s
}

/** Extract a numeric price (major units) from a formatted price string. */
function priceNumber(price: string): number | null {
  const m = price.replace(/\s/g, '').match(/(\d+[.,]?\d*)/)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function asInStock(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase().trim()
  if (!s) return true
  return !(
    s.includes('out of stock') ||
    s.includes('outofstock') ||
    s.includes('out_of_stock') ||
    s.includes('unavailable') ||
    s === 'false' ||
    s === 'no' ||
    s === '0'
  )
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapProduct(raw: Raw, i: number): CommerceProduct | null {
  const title = pick(raw, KEYS.title)
  if (!title || typeof title !== 'string') return null
  const desc = pick(raw, KEYS.desc)
  const descStr = typeof desc === 'string' ? stripTags(desc) : ''
  return {
    id: String(pick(raw, KEYS.id) ?? `feed-${i}`),
    title: title.trim(),
    price: asPrice(pick(raw, KEYS.price)),
    url: String(pick(raw, KEYS.url) ?? ''),
    imageUrl: asImageUrl(pick(raw, KEYS.image)),
    inStock: asInStock(pick(raw, KEYS.inStock)),
    shortDescription: descStr ? descStr.slice(0, 280) : undefined,
  }
}

// --------------------------------- JSON ---------------------------------
function extractArray(data: unknown): Raw[] {
  if (Array.isArray(data)) return data as Raw[]
  if (data && typeof data === 'object') {
    const o = data as Raw
    for (const k of ['products', 'items', 'data', 'results', 'edges', 'hits']) {
      if (Array.isArray(o[k])) return o[k] as Raw[]
    }
    if (o.collection && typeof o.collection === 'object') return extractArray(o.collection)
  }
  return []
}

// --------------------------------- XML ----------------------------------
function decodeXml(s: string): string {
  return s
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim()
}

/** Pull <item> / <entry> blocks and flatten their child tags into Raw objects. */
function xmlToRaw(xml: string): Raw[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? []
  return blocks.map((block) => {
    const obj: Raw = {}
    // Strip the wrapping <item>/<entry> tags so the scanner only sees children.
    const inner = block
      .replace(/^<(?:item|entry)\b[^>]*>/i, '')
      .replace(/<\/(?:item|entry)>\s*$/i, '')
    const tagRe = /<([a-z0-9_:.-]+)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi
    let m: RegExpExecArray | null
    while ((m = tagRe.exec(inner))) {
      const local = m[1].replace(/^[^:]*:/, '').toLowerCase() // strip namespace prefix
      const val = decodeXml(m[2])
      if (val && obj[local] === undefined) obj[local] = val
    }
    // Atom <link href="…"/> and <media:content url="…"/> have no text body.
    if (obj.link === undefined) {
      const href = block.match(/<link[^>]*href=["']([^"']+)["']/i)
      if (href) obj.link = href[1]
    }
    if (obj.image === undefined && obj.image_link === undefined) {
      const img = block.match(/<(?:media:)?(?:content|thumbnail)[^>]*url=["']([^"']+)["']/i)
      if (img) obj.image = img[1]
    }
    return obj
  })
}

// --------------------------------- CSV ----------------------------------
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function csvToRaw(csv: string): Raw[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line)
    const obj: Raw = {}
    headers.forEach((h, i) => {
      if (h) obj[h] = cells[i] ?? ''
    })
    return obj
  })
}

/** Detect format by first non-whitespace char and parse into product cards. */
export function parseFeed(text: string): CommerceProduct[] {
  const trimmed = text.replace(/^﻿/, '').trimStart()
  let rows: Raw[] = []
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      rows = extractArray(JSON.parse(trimmed))
    } catch {
      rows = []
    }
  } else if (trimmed.startsWith('<')) {
    rows = xmlToRaw(trimmed)
  } else {
    rows = csvToRaw(trimmed)
  }
  return rows.map((raw, i) => mapProduct(raw, i)).filter((p): p is CommerceProduct => p !== null)
}

async function loadFeed(url: string, deps: CommerceDeps, maxBytes: number): Promise<CommerceProduct[]> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }
  const fetchImpl = deps.fetchImpl ?? fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(url, { signal: controller.signal })
    if (!res.ok) throw new Error(`Feed responded ${res.status}`)
    const text = (await res.text()).slice(0, maxBytes)
    return parseFeed(text)
  } finally {
    clearTimeout(timer)
  }
}

/** Whether a product matches the query (all terms) and price bounds. */
function matches(p: CommerceProduct, tokens: string[], min?: number, max?: number): boolean {
  if (min != null || max != null) {
    const n = priceNumber(p.price)
    if (n != null) {
      if (min != null && n < min) return false
      if (max != null && n > max) return false
    }
  }
  if (!tokens.length) return true
  const hay = `${p.title} ${p.shortDescription ?? ''}`.toLowerCase()
  return tokens.every((t) => hay.includes(t))
}

/**
 * Live catalog search over a product feed: fetch, parse, and filter in-memory.
 * Large feeds are capped at ~4MB (whole items beyond that are not searched).
 */
export async function searchFeed(
  feedUrl: string,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  if (!feedUrl) return []
  const products = await loadFeed(feedUrl, deps, FEED_MAX_BYTES)
  const tokens = (params.query ?? '').toLowerCase().split(/\s+/).filter((t) => t.length > 1)
  const limit = Math.min(params.limit ?? DEFAULT_LIMIT, 24)
  let out = products.filter((p) => matches(p, tokens, params.minPrice, params.maxPrice))
  // If a strict all-terms match found nothing, relax to any-term.
  if (out.length === 0 && tokens.length > 1) {
    out = products.filter((p) => {
      const hay = `${p.title} ${p.shortDescription ?? ''}`.toLowerCase()
      return tokens.some((t) => hay.includes(t)) && matches(p, [], params.minPrice, params.maxPrice)
    })
  }
  return out.slice(0, limit)
}

/** Validate a feed URL is reachable and parseable; return the parsed count. */
export async function validateFeed(
  feedUrl: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  try {
    const products = await loadFeed(feedUrl, deps, FEED_MAX_BYTES)
    return { ok: products.length > 0, total: products.length }
  } catch {
    return { ok: false, total: 0 }
  }
}

/** Legacy "fetch URL" quick action — first N products, no query filter. */
export async function fetchProductsFromUrl(url: string, limit = DEFAULT_LIMIT): Promise<CommerceProduct[]> {
  return (await loadFeed(url, {}, QUICK_MAX_BYTES)).slice(0, limit)
}
