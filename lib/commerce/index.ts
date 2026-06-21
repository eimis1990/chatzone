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

export type { CommerceProduct, ProductSearchParams } from '@/lib/commerce/types'
