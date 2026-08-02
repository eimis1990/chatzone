import { fetchShopifyProductsByIds } from '@/lib/commerce/shopify'
import { fetchShopifyCatalog } from '@/lib/products/catalog'
import type { CommerceProviderProfile } from './types'

export const shopifyProductSearchProfile: CommerceProviderProfile = {
  provider: 'shopify',
  // Shopify docs carry structured option attributes (Color/Size values), same
  // as Woo — the model needs them on the full candidate pool to verify hard
  // constraints and pick closest-shade fallbacks. Magento stays at the default
  // 8: its sync collects no attributes, so there is nothing extra to verify.
  candidateDetailsLimit: 20,
  catalogSync: {
    configured: (config) => Boolean(config.shopifyDomain && config.shopifyToken),
    fetch: (config) => fetchShopifyCatalog(config.shopifyDomain!, config.shopifyToken!),
  },
  semantic: {
    matcherRpc: 'match_products',
    configured: (config) => Boolean(config.shopifyDomain && config.shopifyToken),
    hydrate: async (config, matches) => {
      const products = await fetchShopifyProductsByIds(
        config.shopifyDomain!,
        config.shopifyToken!,
        matches.map((match) => match.external_id),
      )
      return new Map(products.map((product) => [product.id, product]))
    },
  },
}
