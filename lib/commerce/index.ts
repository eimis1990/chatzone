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

export type { CommerceProduct, ProductSearchParams, OrderStatus, DiscountInfo } from '@/lib/commerce/types'
