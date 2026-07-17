import { fetchMagentoProductsBySkus } from '@/lib/commerce/magento'
import { fetchMagentoCatalog } from '@/lib/products/catalog'
import type { CommerceProviderProfile } from './types'

export const magentoProductSearchProfile: CommerceProviderProfile = {
  provider: 'magento',
  catalogSync: {
    configured: (config) => Boolean(config.storeUrl),
    fetch: (config) => fetchMagentoCatalog(config.storeUrl),
  },
  semantic: {
    matcherRpc: 'match_products',
    configured: (config) => Boolean(config.storeUrl),
    hydrate: async (config, matches) => {
      const products = await fetchMagentoProductsBySkus(
        config.storeUrl,
        matches.map((match) => match.external_id),
      )
      return new Map(products.map((product) => [product.id, product]))
    },
  },
}
