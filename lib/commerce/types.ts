export type CommerceProvider = 'woocommerce'

/** Normalized product shape used by the chat tool + product cards. */
export interface CommerceProduct {
  id: string
  title: string
  /** Display-formatted price, e.g. "3,99 €". */
  price: string
  /** Link to the product page. */
  url: string
  imageUrl?: string
  inStock: boolean
  shortDescription?: string
}

export interface ProductSearchParams {
  query: string
  /** Price bounds in major currency units (e.g. euros), as the shopper would say. */
  minPrice?: number
  maxPrice?: number
  limit?: number
}

export interface CommerceDeps {
  fetchImpl?: typeof fetch
}
