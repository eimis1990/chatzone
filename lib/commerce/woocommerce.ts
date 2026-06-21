import type { CommerceProduct, ProductSearchParams, CommerceDeps } from '@/lib/commerce/types'

/** Shape of a product from the public WooCommerce Store API (subset we use). */
interface WooProduct {
  id: number
  name: string
  permalink: string
  is_in_stock: boolean
  short_description?: string
  images?: Array<{ src?: string; thumbnail?: string }>
  prices?: {
    price?: string
    currency_minor_unit?: number
    currency_symbol?: string
    currency_prefix?: string
    currency_suffix?: string
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&nbsp;': ' ',
}

/** Decode HTML entities (numeric + common named) found in WooCommerce strings. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => NAMED_ENTITIES[m.toLowerCase()] ?? ' ')
}

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/** Format a Store API price object (minor units) into a display string. */
export function formatWooPrice(prices: WooProduct['prices']): string {
  if (!prices?.price) return ''
  const minor = prices.currency_minor_unit ?? 2
  const amount = Number(prices.price) / 10 ** minor
  const value = amount.toFixed(minor)
  const prefix = prices.currency_prefix ?? ''
  const suffix = prices.currency_suffix ?? ''
  if (prefix || suffix) return `${prefix}${value}${suffix}`.trim()
  return `${value} ${prices.currency_symbol ?? ''}`.trim()
}

export function normalizeWooProduct(p: WooProduct): CommerceProduct {
  return {
    id: String(p.id),
    title: decodeEntities(p.name),
    price: formatWooPrice(p.prices),
    url: p.permalink,
    imageUrl: p.images?.[0]?.src ?? p.images?.[0]?.thumbnail,
    inStock: Boolean(p.is_in_stock),
    shortDescription: stripHtml(p.short_description) || undefined,
  }
}

/** Normalize a store base URL (strip trailing slash + any path). */
export function storeOrigin(storeUrl: string): string {
  try {
    return new URL(storeUrl).origin
  } catch {
    return storeUrl.replace(/\/+$/, '')
  }
}

/**
 * Live product search against the public WooCommerce Store API.
 * No auth required (read-only). Price filters are in major units and converted
 * to the API's minor units (×100).
 */
export async function searchWooProducts(
  storeUrl: string,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const base = storeOrigin(storeUrl)
  const qs = new URLSearchParams()
  if (params.query) qs.set('search', params.query)
  if (params.minPrice != null) qs.set('min_price', String(Math.round(params.minPrice * 100)))
  if (params.maxPrice != null) qs.set('max_price', String(Math.round(params.maxPrice * 100)))
  qs.set('per_page', String(Math.min(params.limit ?? 6, 12)))

  const run = async (search: string): Promise<WooProduct[]> => {
    const p = new URLSearchParams(qs)
    if (search) p.set('search', search)
    else p.delete('search')
    const res = await fetchImpl(`${base}/wp-json/wc/store/v1/products?${p.toString()}`)
    if (!res.ok) throw new Error(`WooCommerce search failed: HTTP ${res.status}`)
    return (await res.json()) as WooProduct[]
  }

  // Note: no automatic single-word broadening — it caused false matches (a
  // search for "sausai" matching "sausainių"). The AI refines the query itself
  // and curates which results to show via the display step.
  const data = await run(params.query)
  return data.map(normalizeWooProduct)
}

/**
 * Validate a WooCommerce Store API and return the total product count.
 * The Store API reports the total in the `x-wp-total` response header.
 */
export async function validateWooStore(
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const res = await fetchImpl(`${storeOrigin(storeUrl)}/wp-json/wc/store/v1/products?per_page=1`)
    if (!res.ok) return { ok: false, total: 0 }
    const data = await res.json()
    if (!Array.isArray(data)) return { ok: false, total: 0 }
    const total = Number(res.headers.get('x-wp-total') ?? data.length)
    return { ok: true, total: Number.isFinite(total) ? total : data.length }
  } catch {
    return { ok: false, total: 0 }
  }
}
