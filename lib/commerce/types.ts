export type CommerceProvider = 'woocommerce' | 'shopify'

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

// ---------------------------------------------------------------------------
// Transactional skills (Phase 3): order status + discount codes
// ---------------------------------------------------------------------------
export interface OrderItem {
  name: string
  quantity: number
  total: string
}

/**
 * Normalized order lookup result. On any failure (not found, identity
 * mismatch, not configured, error) `found` is false and NO order data is
 * returned — only `reason` is safe to surface.
 */
export interface OrderStatus {
  found: boolean
  reason?: 'not_found' | 'email_mismatch' | 'not_configured' | 'error'
  orderNumber?: string
  status?: string
  total?: string
  currency?: string
  items?: OrderItem[]
  tracking?: { number?: string; url?: string }
  dateCreated?: string
}

export interface OrderLookupParams {
  /** Order id/number as the shopper would read it off their receipt. */
  orderId: string
  /** Email that must match the order's billing email (identity check). */
  email: string
}

export interface DiscountInfo {
  enabled: boolean
  code?: string
  description?: string
}
