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

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
    title: p.name,
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

  const res = await fetchImpl(`${base}/wp-json/wc/store/v1/products?${qs.toString()}`)
  if (!res.ok) throw new Error(`WooCommerce search failed: HTTP ${res.status}`)
  const data = (await res.json()) as WooProduct[]
  return data.map(normalizeWooProduct)
}

/** Validate that a URL is a reachable WooCommerce Store API. */
export async function validateWooStore(
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<boolean> {
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const res = await fetchImpl(`${storeOrigin(storeUrl)}/wp-json/wc/store/v1/products?per_page=1`)
    if (!res.ok) return false
    const data = await res.json()
    return Array.isArray(data)
  } catch {
    return false
  }
}
