import type {
  CommerceProduct,
  ProductSearchParams,
  ProductDetails,
  CommerceDeps,
  OrderStatus,
  OrderLookupParams,
  OrderItem,
} from '@/lib/commerce/types'

/** Shape of a product from the public WooCommerce Store API (subset we use). */
interface WooProduct {
  id: number
  name: string
  permalink: string
  is_in_stock: boolean
  short_description?: string
  description?: string
  images?: Array<{ src?: string; thumbnail?: string }>
  attributes?: Array<{ name?: string; terms?: Array<{ name?: string }> }>
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

/** Truncate to at most `max` chars at a word boundary, adding an ellipsis. */
function truncateWords(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
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
  // Many stores leave short_description empty but fill the full description —
  // fall back to it (stripped + truncated) so the inline "Details" panel has
  // something useful to reveal.
  const summary = stripHtml(p.short_description) || stripHtml(p.description)
  return {
    id: String(p.id),
    title: decodeEntities(p.name),
    price: formatWooPrice(p.prices),
    url: p.permalink,
    imageUrl: p.images?.[0]?.src ?? p.images?.[0]?.thumbnail,
    inStock: Boolean(p.is_in_stock),
    shortDescription: summary ? truncateWords(summary, 280) : undefined,
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
 * Full live details for up to a few products by id (public Store API): the
 * complete description (HTML-stripped, capped) plus attribute lines like
 * "Spalva: mėlyna, žalia" — for the model to answer depth questions, never
 * rendered as cards.
 */
export async function fetchWooProductDetails(
  storeUrl: string,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<ProductDetails[]> {
  if (ids.length === 0) return []
  const fetchImpl = deps.fetchImpl ?? fetch
  const base = storeOrigin(storeUrl)
  const res = await fetchImpl(
    `${base}/wp-json/wc/store/v1/products?include=${ids.join(',')}&per_page=${ids.length}`,
  )
  if (!res.ok) throw new Error(`WooCommerce details failed: HTTP ${res.status}`)
  const rows = (await res.json()) as WooProduct[]
  return rows.map((p) => {
    const full = stripHtml(p.description) || stripHtml(p.short_description)
    const attributes = (p.attributes ?? [])
      .map((a) => {
        const terms = (a.terms ?? []).map((t) => t.name).filter(Boolean).join(', ')
        return a.name && terms ? `${decodeEntities(a.name)}: ${decodeEntities(terms)}` : ''
      })
      .filter(Boolean)
    return {
      id: String(p.id),
      title: decodeEntities(p.name),
      description: full ? truncateWords(full, 1500) : undefined,
      ...(attributes.length ? { attributes } : {}),
    }
  })
}

// ---------------------------------------------------------------------------
// Order status — authenticated WooCommerce REST API (wc/v3).
// Unlike product search (public Store API), this needs consumer key/secret and
// must run server-side only. We verify the shopper's identity (order id + a
// matching billing email) before returning anything.
// ---------------------------------------------------------------------------

/** Subset of a WooCommerce REST order we read. */
interface WooOrder {
  id: number
  number?: string
  status?: string
  currency?: string
  total?: string
  date_created?: string
  billing?: { email?: string }
  line_items?: Array<{ name?: string; quantity?: number; total?: string }>
  meta_data?: Array<{ key?: string; value?: unknown }>
}

/** Base64 encode for the Basic auth header (works in Edge + Node). */
function basicAuth(key: string, secret: string): string {
  const raw = `${key}:${secret}`
  if (typeof btoa !== 'undefined') return 'Basic ' + btoa(raw)
  return 'Basic ' + Buffer.from(raw).toString('base64')
}

/** Best-effort tracking number from common Shipment Tracking meta keys. */
function extractTracking(order: WooOrder): OrderStatus['tracking'] | undefined {
  for (const m of order.meta_data ?? []) {
    if (!m?.key) continue
    if (/tracking[_-]?number/i.test(m.key) && typeof m.value === 'string' && m.value.trim()) {
      return { number: m.value.trim() }
    }
  }
  return undefined
}

export function normalizeWooOrder(order: WooOrder): OrderStatus {
  const items: OrderItem[] = (order.line_items ?? []).map((li) => ({
    name: decodeEntities(li.name ?? ''),
    quantity: Number(li.quantity ?? 0),
    total: String(li.total ?? ''),
  }))
  return {
    found: true,
    orderNumber: String(order.number ?? order.id),
    status: order.status,
    total: order.total,
    currency: order.currency,
    items,
    tracking: extractTracking(order),
    dateCreated: order.date_created,
  }
}

/**
 * Look up an order by id, gated by a matching billing email. Returns a safe
 * failure (no data) on missing creds, bad id, not found, or email mismatch.
 */
export async function getWooOrderStatus(
  storeUrl: string,
  restKey: string,
  restSecret: string,
  params: OrderLookupParams,
  deps: CommerceDeps = {},
): Promise<OrderStatus> {
  if (!restKey || !restSecret) return { found: false, reason: 'not_configured' }
  const id = String(params.orderId ?? '').replace(/\D/g, '')
  const email = String(params.email ?? '').trim().toLowerCase()
  if (!id || !email) return { found: false, reason: 'not_found' }

  const fetchImpl = deps.fetchImpl ?? fetch
  const base = storeOrigin(storeUrl)
  try {
    const res = await fetchImpl(`${base}/wp-json/wc/v3/orders/${id}`, {
      headers: { Authorization: basicAuth(restKey, restSecret) },
    })
    if (res.status === 404) return { found: false, reason: 'not_found' }
    if (!res.ok) return { found: false, reason: 'error' }
    const order = (await res.json()) as WooOrder
    const billingEmail = (order.billing?.email ?? '').trim().toLowerCase()
    // Identity check: never reveal an order unless the email matches.
    if (!billingEmail || billingEmail !== email) {
      return { found: false, reason: 'email_mismatch' }
    }
    return normalizeWooOrder(order)
  } catch {
    return { found: false, reason: 'error' }
  }
}

/** Check that REST consumer key/secret can read orders (for the configurator). */
export async function validateWooOrderAccess(
  storeUrl: string,
  restKey: string,
  restSecret: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!restKey || !restSecret) return { ok: false, error: 'Enter both the consumer key and secret.' }
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const res = await fetchImpl(`${storeOrigin(storeUrl)}/wp-json/wc/v3/orders?per_page=1`, {
      headers: { Authorization: basicAuth(restKey, restSecret) },
    })
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Unauthorized — check the key/secret and that it has read access.' }
    }
    if (!res.ok) return { ok: false, error: `WooCommerce REST returned HTTP ${res.status}.` }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the WooCommerce REST API.' }
  }
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
