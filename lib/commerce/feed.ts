/**
 * Fetches an owner-configured endpoint and maps its JSON into product cards for
 * a "fetch URL" quick action. The mapper is deliberately tolerant — it matches
 * common field names across Shopify/Woo/custom feeds — so most endpoints work
 * without extra configuration.
 *
 * The URL is always owner-configured (never visitor-supplied), but we still
 * guard against abuse: http(s) only, a short timeout, and a response size cap.
 */
import type { CommerceProduct } from './types'

const TIMEOUT_MS = 6000
const MAX_BYTES = 1_500_000
const DEFAULT_LIMIT = 12

type Raw = Record<string, unknown>

const KEYS = {
  title: ['title', 'name', 'product_title', 'productName', 'displayName'],
  price: ['price', 'price_str', 'displayPrice', 'priceFormatted', 'min_price', 'amount'],
  url: ['url', 'link', 'permalink', 'href', 'product_url', 'productUrl'],
  image: ['imageUrl', 'image', 'featured_image', 'thumbnail', 'img', 'image_url', 'picture', 'images'],
  id: ['id', 'sku', 'handle', 'productId', 'product_id', 'variant_id'],
  inStock: ['inStock', 'in_stock', 'available', 'availability'],
  desc: ['shortDescription', 'short_description', 'description', 'summary', 'subtitle'],
}

function pick(obj: Raw, keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]
  }
  return undefined
}

/** Extract a usable image URL from a string, {src|url}, or an array of those. */
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
  // A bare numeric string → format with currency; otherwise keep as given.
  if (/^\d+([.,]\d+)?$/.test(s)) return `${Number(s.replace(',', '.')).toFixed(2)} €`
  return s
}

function asInStock(v: unknown): boolean {
  if (v == null) return true
  if (typeof v === 'boolean') return v
  const s = String(v).toLowerCase()
  return !(s === 'false' || s === 'outofstock' || s === 'out_of_stock' || s === 'no' || s === '0')
}

function mapProduct(raw: Raw, i: number): CommerceProduct | null {
  const title = pick(raw, KEYS.title)
  if (!title || typeof title !== 'string') return null
  const desc = pick(raw, KEYS.desc)
  return {
    id: String(pick(raw, KEYS.id) ?? `feed-${i}`),
    title: title.trim(),
    price: asPrice(pick(raw, KEYS.price)),
    url: String(pick(raw, KEYS.url) ?? ''),
    imageUrl: asImageUrl(pick(raw, KEYS.image)),
    inStock: asInStock(pick(raw, KEYS.inStock)),
    shortDescription: typeof desc === 'string' ? desc.slice(0, 200) : undefined,
  }
}

/** Find the product array in a variety of common envelope shapes. */
function extractArray(data: unknown): Raw[] {
  if (Array.isArray(data)) return data as Raw[]
  if (data && typeof data === 'object') {
    const o = data as Raw
    for (const k of ['products', 'items', 'data', 'results', 'edges', 'hits']) {
      if (Array.isArray(o[k])) return o[k] as Raw[]
    }
  }
  return []
}

export async function fetchProductsFromUrl(url: string, limit = DEFAULT_LIMIT): Promise<CommerceProduct[]> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) URLs are allowed')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Feed responded ${res.status}`)
    const text = (await res.text()).slice(0, MAX_BYTES)
    const data = JSON.parse(text)
    // Shopify collection feeds may nest under {collection:{products:[]}}.
    const arr =
      extractArray(data).length > 0
        ? extractArray(data)
        : extractArray((data as Raw)?.collection)
    return arr
      .map((raw, i) => mapProduct(raw, i))
      .filter((p): p is CommerceProduct => p !== null)
      .slice(0, limit)
  } finally {
    clearTimeout(timer)
  }
}
