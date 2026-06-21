import type { CommerceProduct, ProductSearchParams, CommerceDeps } from '@/lib/commerce/types'
import { searchWooProducts, validateWooStore } from '@/lib/commerce/woocommerce'

export interface CommerceConfig {
  enabled: boolean
  provider: 'woocommerce'
  storeUrl: string
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

/** Validate a store connection for the configured provider. */
export async function validateStore(
  provider: CommerceConfig['provider'],
  storeUrl: string,
  deps: CommerceDeps = {},
): Promise<boolean> {
  switch (provider) {
    case 'woocommerce':
      return validateWooStore(storeUrl, deps)
    default:
      return false
  }
}

export type { CommerceProduct, ProductSearchParams } from '@/lib/commerce/types'
