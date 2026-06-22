import type {
  CommerceProduct,
  ProductSearchParams,
  CommerceDeps,
  OrderStatus,
  OrderLookupParams,
  DiscountInfo,
} from '@/lib/commerce/types'
import {
  searchWooProducts,
  validateWooStore,
  getWooOrderStatus,
  validateWooOrderAccess,
} from '@/lib/commerce/woocommerce'

export interface CommerceConfig {
  enabled: boolean
  provider: 'woocommerce'
  storeUrl: string
  /** WooCommerce REST consumer key/secret — server-only, for order lookups. */
  restKey?: string
  restSecret?: string
  /** A static discount the agent can offer on discount intent. */
  discount?: { enabled: boolean; code?: string; description?: string }
}

/** Search a store's catalog using the configured provider. */
export async function searchStore(
  config: CommerceConfig,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  if (!config?.enabled || !config.storeUrl) return []
  switch (config.provider) {
    case 'woocommerce':
      return searchWooProducts(config.storeUrl, params, deps)
    default:
      return []
  }
}

/** Validate a store connection and return the catalog size for the provider. */
export async function validateStore(
  provider: CommerceConfig['provider'],
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  switch (provider) {
    case 'woocommerce':
      return validateWooStore(storeUrl, deps)
    default:
      return { ok: false, total: 0 }
  }
}

/** Look up an order's status, gated by a matching billing email. */
export async function getOrderStatus(
  config: CommerceConfig,
  params: OrderLookupParams,
  deps: CommerceDeps = {},
): Promise<OrderStatus> {
  if (!config?.enabled || !config.storeUrl) return { found: false, reason: 'not_configured' }
  switch (config.provider) {
    case 'woocommerce':
      return getWooOrderStatus(
        config.storeUrl,
        config.restKey ?? '',
        config.restSecret ?? '',
        params,
        deps,
      )
    default:
      return { found: false, reason: 'not_configured' }
  }
}

/** Validate REST credentials can read orders (configurator "test"). */
export async function validateOrderAccess(
  provider: CommerceConfig['provider'],
  storeUrl: string,
  restKey: string,
  restSecret: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; error?: string }> {
  switch (provider) {
    case 'woocommerce':
      return validateWooOrderAccess(storeUrl, restKey, restSecret, deps)
    default:
      return { ok: false, error: 'Unsupported provider' }
  }
}

/** The configured discount the agent may offer, or a disabled result. */
export function getDiscount(config: CommerceConfig): DiscountInfo {
  const d = config?.discount
  if (!d?.enabled || !d.code) return { enabled: false }
  return { enabled: true, code: d.code, description: d.description }
}

/** Whether order lookups are usable (enabled + store + REST creds present). */
export function orderLookupEnabled(config: CommerceConfig): boolean {
  return Boolean(config?.enabled && config.storeUrl && config.restKey && config.restSecret)
}

/** A short, agent-speakable summary of an order lookup (the agent translates it). */
export function summarizeOrder(order: OrderStatus): string {
  if (!order.found) {
    if (order.reason === 'not_configured') return 'Order lookup is not available for this store.'
    if (order.reason === 'error') return 'The order lookup failed — ask them to try again shortly.'
    return 'No order matches that number and email. Ask them to double-check both, or offer a human.'
  }
  const parts = [`Order ${order.orderNumber}`, `status ${order.status ?? 'unknown'}`]
  if (order.total) parts.push(`total ${[order.total, order.currency].filter(Boolean).join(' ')}`)
  if (order.tracking?.number) parts.push(`tracking ${order.tracking.number}`)
  return `${parts.join(', ')}. The full details are shown on screen.`
}

/** A short, agent-speakable summary of the discount. */
export function summarizeDiscount(d: DiscountInfo): string {
  if (!d.enabled) return 'There is no discount code available right now.'
  return `The discount code is ${d.code}${d.description ? ` (${d.description})` : ''}.`
}

export type { CommerceProduct, ProductSearchParams, OrderStatus, DiscountInfo } from '@/lib/commerce/types'
