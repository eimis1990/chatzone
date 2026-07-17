import type { CommerceProduct } from '@/lib/commerce/types'
import { fetchWooCatalog } from '@/lib/products/catalog'
import {
  normalizeWooProduct,
  storeOrigin,
  STOREFRONT_HEADERS,
} from '@/lib/commerce/woocommerce'
import type { CommerceProviderProfile } from './types'

export const woocommerceProductSearchProfile: CommerceProviderProfile = {
  provider: 'woocommerce',
  catalogSync: {
    configured: (config) => Boolean(config.storeUrl),
    fetch: (config, onFetched) => fetchWooCatalog(config.storeUrl, fetch, onFetched),
  },
  semantic: {
    matcherRpc: 'match_products',
    configured: (config) => Boolean(config.storeUrl),
    hydrate: async (config, matches) => {
      const products = new Map<string, CommerceProduct>()
      if (!matches.length) return products
      const ids = matches.map((match) => match.external_id)
      const base = storeOrigin(config.storeUrl)
      const response = await fetch(
        `${base}/wp-json/wc/store/v1/products?include=${ids.join(',')}&per_page=${ids.length}`,
        { headers: STOREFRONT_HEADERS },
      )
      if (!response.ok) return products
      const rows = (await response.json()) as Parameters<typeof normalizeWooProduct>[0][]
      for (const row of rows) {
        const product = normalizeWooProduct(row)
        products.set(product.id, product)
      }
      return products
    },
  },
}
