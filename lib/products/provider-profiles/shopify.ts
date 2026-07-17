import { fetchShopifyProductsByIds } from '@/lib/commerce/shopify'
import { fetchShopifyCatalog } from '@/lib/products/catalog'
import type { CommerceProviderProfile } from './types'

export const shopifyProductSearchProfile: CommerceProviderProfile = {
  provider: 'shopify',
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
