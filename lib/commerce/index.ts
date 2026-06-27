import type {
  CommerceProduct,
  CommerceProvider,
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
import { searchShopifyProducts, validateShopifyStore } from '@/lib/commerce/shopify'
import {
  searchMagentoProducts,
  validateMagentoStore,
  getMagentoOrderStatus,
  validateMagentoOrderAccess,
} from '@/lib/commerce/magento'
import { searchFeed, validateFeed } from '@/lib/commerce/feed'

export interface CommerceConfig {
  enabled: boolean
  provider: CommerceProvider
  /** WooCommerce store URL (and base for the REST API). */
  storeUrl: string
  /** WooCommerce REST consumer key/secret — server-only, for order lookups. */
  restKey?: string
  restSecret?: string
  /** Shopify Storefront domain + token (server-only token). */
  shopifyDomain?: string
  shopifyToken?: string
  /** Magento integration access token — server-only, for order lookups. */
  magentoToken?: string
  /** Product feed URL (JSON/XML/CSV) for the 'feed' provider. */
  feedUrl?: string
  /** A static discount the agent can offer on discount intent. */
  discount?: { enabled: boolean; code?: string; description?: string }
}

/** Whether the active provider has the fields it needs to run a search. */
export function storeConfigured(config: CommerceConfig): boolean {
  if (!config?.enabled) return false
  switch (config.provider) {
    case 'woocommerce':
      return Boolean(config.storeUrl)
    case 'shopify':
      return Boolean(config.shopifyDomain && config.shopifyToken)
    case 'magento':
      return Boolean(config.storeUrl)
    case 'feed':
      return Boolean(config.feedUrl)
    default:
      return false
  }
}

/** Search a store's catalog using the configured provider. */
export async function searchStore(
  config: CommerceConfig,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  if (!storeConfigured(config)) return []
  switch (config.provider) {
    case 'woocommerce':
      return searchWooProducts(config.storeUrl, params, deps)
    case 'shopify':
      return searchShopifyProducts(config.shopifyDomain!, config.shopifyToken!, params, deps)
    case 'magento':
      return searchMagentoProducts(config.storeUrl, params, deps)
    case 'feed':
      return searchFeed(config.feedUrl ?? '', params, deps)
    default:
      return []
  }
}

/** Validate a store connection and return the catalog size for the provider. */
export async function validateStore(
  config: {
    provider: CommerceProvider
    storeUrl?: string
    shopifyDomain?: string
    shopifyToken?: string
    feedUrl?: string
  },
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  switch (config.provider) {
    case 'woocommerce':
      return config.storeUrl ? validateWooStore(config.storeUrl, deps) : { ok: false, total: 0 }
    case 'shopify':
      return config.shopifyDomain && config.shopifyToken
        ? validateShopifyStore(config.shopifyDomain, config.shopifyToken, deps)
        : { ok: false, total: 0 }
    case 'magento':
      return config.storeUrl ? validateMagentoStore(config.storeUrl, deps) : { ok: false, total: 0 }
    case 'feed':
      return config.feedUrl ? validateFeed(config.feedUrl, deps) : { ok: false, total: 0 }
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
    case 'magento':
      return getMagentoOrderStatus(config.storeUrl, config.magentoToken ?? '', params, deps)
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
    // Magento uses a single integration token, passed in the `restKey` slot.
    case 'magento':
      return validateMagentoOrderAccess(storeUrl, restKey, deps)
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

/** Whether order lookups are usable (enabled + store + the provider's creds). */
export function orderLookupEnabled(config: CommerceConfig): boolean {
  if (!config?.enabled || !config.storeUrl) return false
  if (config.provider === 'magento') return Boolean(config.magentoToken)
  return Boolean(config.restKey && config.restSecret)
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
