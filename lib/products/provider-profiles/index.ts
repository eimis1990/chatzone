import type { CommerceProvider } from '@/lib/commerce/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import { feedProductSearchProfile } from './feed'
import { magentoProductSearchProfile } from './magento'
import { shopifyProductSearchProfile } from './shopify'
import type {
  CommerceConfig,
  CommerceProviderProfile,
  CompleteDisplaySelectionInput,
} from './types'
import { verskisProductSearchProfile } from './verskis'
import { woocommerceProductSearchProfile } from './woocommerce'
export {
  providerDisplayGuidance,
  providerSearchQueryGuidance,
} from './guidance'

/** Single extension point for provider-specific commerce behavior and policy.
 * A provider improvement belongs in its profile/connector/RPC, never in a
 * shared orchestration path or a store-domain branch. */
export const commerceProviderProfiles = Object.freeze({
  woocommerce: woocommerceProductSearchProfile,
  shopify: shopifyProductSearchProfile,
  magento: magentoProductSearchProfile,
  verskis: verskisProductSearchProfile,
  feed: feedProductSearchProfile,
}) satisfies Readonly<Record<CommerceProvider, CommerceProviderProfile>>

export function commerceProviderProfile(config: CommerceConfig): CommerceProviderProfile {
  return commerceProviderProfiles[config.provider]
}

export function providerCandidateDetailsLimit(config?: CommerceConfig): number {
  return config ? commerceProviderProfile(config).candidateDetailsLimit ?? 8 : 8
}

export function providerCompleteDisplaySelection(
  config: CommerceConfig | undefined,
  input: CompleteDisplaySelectionInput,
): CommerceProduct[] {
  return config
    ? commerceProviderProfile(config).completeDisplaySelection?.(input) ?? input.selected
    : input.selected
}

export function providerProductDetailsReference(
  config: CommerceConfig,
  productId: string,
  product?: CommerceProduct,
): string {
  return (product && commerceProviderProfile(config).productDetailsReference?.(product)) || productId
}

export type {
  CatalogSyncProfile,
  CompleteDisplaySelectionInput,
  CommerceConfig,
  IndexedProductMatch,
  ProductMatcherRpc,
  CommerceProviderProfile,
  SemanticProductProfile,
} from './types'
