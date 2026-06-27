import type {
  CommerceProduct,
  ProductSearchParams,
  CommerceDeps,
  OrderStatus,
  OrderLookupParams,
  OrderItem,
} from '@/lib/commerce/types'

// ---------------------------------------------------------------------------
// Magento 2 connector.
//   • Product search → GraphQL Storefront API ({base}/graphql), unauthenticated.
//   • Order lookup   → REST API ({base}/rest/V1/orders), Bearer integration
//     token (server-only). Gated by a matching customer email (identity check).
// ---------------------------------------------------------------------------

/** Normalize a store base URL to its origin (strip path + trailing slash). */
export function magentoBase(storeUrl: string): string {
  try {
    return new URL(storeUrl).origin
  } catch {
    return storeUrl.replace(/\/+$/, '')
  }
}

// ---------------------------------- Search ----------------------------------

interface MagentoMoney {
  value?: number
  currency?: string
}
interface MagentoProductItem {
  uid?: string
  sku?: string
  name?: string
  url_key?: string
  canonical_url?: string | null
  stock_status?: string
  short_description?: { html?: string } | null
  small_image?: { url?: string } | null
  price_range?: { minimum_price?: { final_price?: MagentoMoney } }
}
interface MagentoGraphQLResponse {
  data?: { products?: { items?: MagentoProductItem[]; total_count?: number } }
  errors?: unknown
}

const SEARCH_QUERY = `query Search($q: String!, $n: Int!) {
  products(search: $q, pageSize: $n) {
    items {
      uid
      sku
      name
      url_key
      canonical_url
      stock_status
      short_description { html }
      small_image { url }
      price_range { minimum_price { final_price { value currency } } }
    }
  }
}`

const COUNT_QUERY = `query Count {
  products(filter: { price: { from: "0" } }, pageSize: 1) { total_count }
}`

function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text: string, max: number): string | undefined {
  if (!text) return undefined
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

export function formatMagentoPrice(money: MagentoMoney | undefined): string {
  if (money?.value == null) return ''
  const value = Number(money.value).toFixed(2)
  return money.currency ? `${value} ${money.currency}` : value
}

/** Build the product page URL from canonical_url (preferred) or url_key. */
function productUrl(base: string, item: MagentoProductItem): string {
  const c = item.canonical_url
  if (c) return /^https?:\/\//.test(c) ? c : `${base}/${c.replace(/^\/+/, '')}`
  if (item.url_key) return `${base}/${item.url_key}`
  return base
}

export function normalizeMagentoProduct(item: MagentoProductItem, base: string): CommerceProduct {
  const summary = stripHtml(item.short_description?.html)
  return {
    id: String(item.uid ?? item.sku ?? ''),
    title: (item.name ?? '').trim(),
    price: formatMagentoPrice(item.price_range?.minimum_price?.final_price),
    url: productUrl(base, item),
    imageUrl: item.small_image?.url ?? undefined,
    inStock: (item.stock_status ?? 'IN_STOCK').toUpperCase() !== 'OUT_OF_STOCK',
    shortDescription: summary ? truncate(summary, 280) : undefined,
  }
}

async function graphql(
  base: string,
  query: string,
  variables: Record<string, unknown>,
  deps: CommerceDeps,
): Promise<MagentoGraphQLResponse> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const res = await fetchImpl(`${base}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Magento GraphQL error: HTTP ${res.status}`)
  return (await res.json()) as MagentoGraphQLResponse
}

/**
 * Product search via the Magento GraphQL Storefront API (no auth).
 * Price filters aren't applied (kept simple, like Shopify) — the agent curates.
 */
export async function searchMagentoProducts(
  storeUrl: string,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const base = magentoBase(storeUrl)
  const n = Math.min(params.limit ?? 10, 20)
  const json = await graphql(base, SEARCH_QUERY, { q: params.query, n }, deps)
  const items = json.data?.products?.items ?? []
  return items.map((it) => normalizeMagentoProduct(it, base))
}

/** Validate the GraphQL catalog is reachable; return a best-effort product count. */
export async function validateMagentoStore(
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  try {
    const json = await graphql(magentoBase(storeUrl), COUNT_QUERY, {}, deps)
    if (json.errors) return { ok: false, total: 0 }
    const total = json.data?.products?.total_count
    if (typeof total !== 'number') return { ok: false, total: 0 }
    return { ok: true, total }
  } catch {
    return { ok: false, total: 0 }
  }
}

// ------------------------------- Order lookup -------------------------------

interface MagentoOrderItem {
  name?: string
  qty_ordered?: number
  row_total?: number | string
}
interface MagentoOrder {
  increment_id?: string
  status?: string
  grand_total?: number | string
  order_currency_code?: string
  customer_email?: string
  created_at?: string
  items?: MagentoOrderItem[]
}
interface MagentoOrdersResponse {
  items?: MagentoOrder[]
  total_count?: number
}

export function normalizeMagentoOrder(order: MagentoOrder): OrderStatus {
  const items: OrderItem[] = (order.items ?? []).map((li) => ({
    name: li.name ?? '',
    quantity: Number(li.qty_ordered ?? 0),
    total: String(li.row_total ?? ''),
  }))
  return {
    found: true,
    orderNumber: String(order.increment_id ?? ''),
    status: order.status,
    total: order.grand_total != null ? String(order.grand_total) : undefined,
    currency: order.order_currency_code,
    items,
    // Magento tracking lives on shipments (a separate call) — omitted for now.
    dateCreated: order.created_at,
  }
}

/** Build the searchCriteria query string filtering by increment_id AND email. */
function ordersQuery(orderId: string, email: string): string {
  const qs = new URLSearchParams()
  qs.set('searchCriteria[filter_groups][0][filters][0][field]', 'increment_id')
  qs.set('searchCriteria[filter_groups][0][filters][0][value]', orderId)
  qs.set('searchCriteria[filter_groups][0][filters][0][condition_type]', 'eq')
  qs.set('searchCriteria[filter_groups][1][filters][0][field]', 'customer_email')
  qs.set('searchCriteria[filter_groups][1][filters][0][value]', email)
  qs.set('searchCriteria[filter_groups][1][filters][0][condition_type]', 'eq')
  qs.set('searchCriteria[pageSize]', '1')
  return qs.toString()
}

/**
 * Look up an order by increment_id, gated by a matching customer email.
 * Returns a safe failure (no data) on missing token, bad input, not found, or
 * email mismatch.
 */
export async function getMagentoOrderStatus(
  storeUrl: string,
  token: string,
  params: OrderLookupParams,
  deps: CommerceDeps = {},
): Promise<OrderStatus> {
  if (!token) return { found: false, reason: 'not_configured' }
  const orderId = String(params.orderId ?? '').trim()
  const email = String(params.email ?? '').trim().toLowerCase()
  if (!orderId || !email) return { found: false, reason: 'not_found' }

  const fetchImpl = deps.fetchImpl ?? fetch
  const base = magentoBase(storeUrl)
  try {
    const res = await fetchImpl(`${base}/rest/V1/orders?${ordersQuery(orderId, email)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 401 || res.status === 403) return { found: false, reason: 'error' }
    if (!res.ok) return { found: false, reason: 'error' }
    const data = (await res.json()) as MagentoOrdersResponse
    const order = data.items?.[0]
    if (!order) return { found: false, reason: 'not_found' }
    // Defensive identity re-check (the query already filters by email).
    if ((order.customer_email ?? '').trim().toLowerCase() !== email) {
      return { found: false, reason: 'email_mismatch' }
    }
    return normalizeMagentoOrder(order)
  } catch {
    return { found: false, reason: 'error' }
  }
}

/** Check that the integration token can read orders (for the configurator). */
export async function validateMagentoOrderAccess(
  storeUrl: string,
  token: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'Enter the Magento access token.' }
  const fetchImpl = deps.fetchImpl ?? fetch
  try {
    const res = await fetchImpl(
      `${magentoBase(storeUrl)}/rest/V1/orders?searchCriteria[pageSize]=1`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
    )
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Unauthorized — check the token and that it can read orders (Sales).' }
    }
    if (!res.ok) return { ok: false, error: `Magento REST returned HTTP ${res.status}.` }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Could not reach the Magento REST API.' }
  }
}
