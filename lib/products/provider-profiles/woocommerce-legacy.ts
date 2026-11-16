import { fetchWooCatalog } from '@/lib/products/catalog'
import { hydrateLegacyWooProducts, legacyWooFetch } from '@/lib/commerce/woocommerce-legacy'
import type { CommerceProviderProfile } from './types'

export const legacyWoocommerceProductSearchProfile: CommerceProviderProfile = {
  provider: 'woocommerce_legacy',
  candidateDetailsLimit: 20,
  catalogSync: {
    configured: config => Boolean(config.storeUrl),
    fetch: (config, onFetched) => fetchWooCatalog(config.storeUrl, legacyWooFetch(), onFetched),
  },
  semantic: {
    matcherRpc: 'match_products',
    configured: config => Boolean(config.storeUrl),
    hydrate: async (config, matches) => {
      const products = await hydrateLegacyWooProducts(config.storeUrl, matches.map(match => match.external_id))
      return new Map(products.map(product => [product.id, product]))
    },
  },
}
