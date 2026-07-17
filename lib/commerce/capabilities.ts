import type { CommerceProvider } from '@/lib/commerce/types'

/** Edge-safe commerce configuration/capability checks.
 *
 * `lib/ai/prompt.ts` is imported by the Edge custom-LLM route, so this module
 * must remain pure: no provider transports, SSRF/DNS guards, or Node built-ins.
 */
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
export function storeConfigured(config: CommerceConfig | undefined | null): boolean {
  if (!config?.enabled) return false
  switch (config.provider) {
    case 'woocommerce':
      return Boolean(config.storeUrl)
    case 'shopify':
      return Boolean(config.shopifyDomain && config.shopifyToken)
    case 'magento':
    case 'verskis':
      return Boolean(config.storeUrl)
    case 'feed':
      return Boolean(config.feedUrl)
    default:
      return false
  }
}

/** Providers with a live full-details API — gates the details tool/prompt. */
export function productDetailsSupported(config: CommerceConfig | undefined | null): boolean {
  if (!config || !storeConfigured(config)) return false
  return (
    config.provider === 'woocommerce' ||
    config.provider === 'shopify' ||
    config.provider === 'verskis'
  )
}

/** Whether order lookups are usable (enabled + store + provider credentials). */
export function orderLookupEnabled(config: CommerceConfig | undefined | null): boolean {
  if (!config?.enabled || !config.storeUrl) return false
  if (config.provider === 'magento') return Boolean(config.magentoToken)
  if (config.provider === 'woocommerce') return Boolean(config.restKey && config.restSecret)
  return false
}
