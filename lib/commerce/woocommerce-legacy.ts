import type { CommerceDeps, ProductSearchParams } from './types'
import {
  fetchWooProductDetails,
  listWooProductsByUrl,
  normalizeWooProduct,
  searchWooProducts,
  storeOrigin,
  STOREFRONT_HEADERS,
  validateWooStore,
} from './woocommerce'
import { assertPublicUrl } from '@/lib/net/ssrf'

type LegacyProduct = Parameters<typeof normalizeWooProduct>[0] & { is_purchasable?: boolean }
const QUOTE_NOTE = 'Request a quote. Confirm price and availability with the store.'

/** Catalogue-only products often expose placeholder zero prices and stock flags.
 * Keep this policy local to the opt-in legacy provider. An explicitly purchasable
 * free product still has a genuine zero price, including on legacy stores. */
function sanitizeProduct(product: LegacyProduct): LegacyProduct {
  const quoteOnly = product.is_purchasable === false ||
    (product.is_purchasable !== true && Number(product.prices?.price || 0) === 0)
  if (!quoteOnly) return product
  return {
    ...product,
    prices: undefined,
    short_description: `<p>${QUOTE_NOTE}</p>${product.short_description || product.description || ''}`,
    description: `<p>${QUOTE_NOTE}</p>${product.description || product.short_description || ''}`,
  }
}

/** Adapt the proven Woo parsers to the unversioned Store API. WordPress's
 * rest_route query works with both pretty and index.php permalinks, so no
 * hostname exceptions or route probing are needed. Standard Woo never uses
 * this transport. It is shared by legacy validation/search/details/sync/hydration.
 */
export function legacyWooFetch(deps: CommerceDeps = {}): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    const products = url.pathname === '/wp-json/wc/store/v1/products'
    if (url.pathname.startsWith('/wp-json/')) {
      const route = url.pathname.slice('/wp-json'.length).replace(/^\/wc\/store\/v1(?=\/)/, '/wc/store')
      url.pathname = '/'
      url.searchParams.set('rest_route', route)
    }
    // Sync/hydration call the transport directly, outside the dispatcher guard.
    if (!deps.fetchImpl) await assertPublicUrl(url.href)
    const response = await (deps.fetchImpl ?? fetch)(url.href, {
      ...init,
      redirect: 'error',
      signal: init?.signal ?? AbortSignal.timeout(10_000),
    })
    // Throw rather than returning a partial catalogue that sync could prune to.
    if (!response.ok) throw new Error(`Legacy WooCommerce request failed: HTTP ${response.status}`)
    if (!products) return response
    const rows: unknown = await response.json()
    if (!Array.isArray(rows) || rows.some(p => !p || typeof p.id !== 'number' || typeof p.name !== 'string')) {
      throw new Error('Legacy WooCommerce returned an invalid product list')
    }
    return new Response(JSON.stringify(rows.map(sanitizeProduct)), {
      headers: {
        'content-type': 'application/json',
        ...(response.headers.has('x-wp-total') ? { 'x-wp-total': response.headers.get('x-wp-total')! } : {}),
      },
    })
  }
}

export function validateLegacyWooStore(storeUrl: string, deps: CommerceDeps = {}) {
  return validateWooStore(storeUrl, { fetchImpl: legacyWooFetch(deps) })
}

export async function searchLegacyWooProducts(storeUrl: string, params: ProductSearchParams, deps: CommerceDeps = {}) {
  const products = await searchWooProducts(storeUrl, params, { fetchImpl: legacyWooFetch(deps) })
  // A placeholder must never qualify as the cheapest item or a budget match.
  return params.minPrice != null || params.maxPrice != null || params.sort
    ? products.filter(product => product.price !== '')
    : products
}

export function fetchLegacyWooProductDetails(storeUrl: string, ids: string[], deps: CommerceDeps = {}) {
  return fetchWooProductDetails(storeUrl, ids, { fetchImpl: legacyWooFetch(deps) })
}

export function listLegacyWooProductsByUrl(storeUrl: string, pageUrl: string, limit: number, deps: CommerceDeps = {}) {
  return listWooProductsByUrl(storeUrl, pageUrl, limit, { fetchImpl: legacyWooFetch(deps) })
}

export async function hydrateLegacyWooProducts(storeUrl: string, ids: string[], deps: CommerceDeps = {}) {
  if (!ids.length) return []
  const qs = new URLSearchParams({ include: ids.join(','), per_page: String(ids.length) })
  const response = await legacyWooFetch(deps)(`${storeOrigin(storeUrl)}/wp-json/wc/store/v1/products?${qs}`, {
    headers: STOREFRONT_HEADERS,
  })
  const rows = await response.json() as LegacyProduct[]
  return rows.map(normalizeWooProduct)
}
