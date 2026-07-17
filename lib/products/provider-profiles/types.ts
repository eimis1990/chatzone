import type { BotConfig } from '@/lib/types'
import type { CommerceProduct, CommerceProvider } from '@/lib/commerce/types'
import type { RawProduct } from '@/lib/products/catalog'

export type CommerceConfig = NonNullable<BotConfig['commerce']>

export interface IndexedProductMatch {
  external_id: string
  url?: string | null
  doc?: string | null
}

export type ProductMatcherRpc = 'match_products' | 'match_products_verskis'

export interface SemanticProductProfile {
  /** Provider-specific database ranking function. Never put store-specific
   * behavior into the shared `match_products` RPC. */
  matcherRpc: ProductMatcherRpc
  configured: (config: CommerceConfig) => boolean
  /** Provider-specific canonicalization used only by the semantic matcher. */
  normalizeQuery?: (query: string) => string
  /** Fetch extra ranked rows before live hydration when this provider commonly
   * loses candidates to stale/unavailable product pages. The shared search
   * still trims the final live list to the caller's requested limit. */
  candidatePoolSize?: (requestedLimit: number) => number
  hydrate: (
    config: CommerceConfig,
    matches: IndexedProductMatch[],
  ) => Promise<Map<string, CommerceProduct>>
  /** Optional guard for detecting an index that belongs to an old store. */
  acceptsIndex?: (config: CommerceConfig, matches: IndexedProductMatch[]) => boolean
}

export interface CatalogSyncProfile {
  configured: (config: CommerceConfig) => boolean
  fetch: (
    config: CommerceConfig,
    onFetched: (fetched: number) => void,
  ) => Promise<RawProduct[]>
  /** Skip generic AI classification when the provider already exposes rich,
   * structured catalog metadata. */
  skipAiEnrichment?: boolean
}

export interface CompleteDisplaySelectionInput {
  query: string
  selected: CommerceProduct[]
  rankedCandidates: CommerceProduct[]
  limit: number
}

export interface CommerceProviderProfile {
  provider: CommerceProvider
  semantic?: SemanticProductProfile
  catalogSync?: CatalogSyncProfile
  /** How many ranked candidates include the indexed comparison details in the
   * model tool result. Higher values improve exhaustive attribute browsing but
   * consume more model input tokens. */
  candidateDetailsLimit?: number
  /** Convert the public product id into the provider's full-details reference.
   * Most providers use the id directly; some require a product URL. */
  productDetailsReference?: (product: CommerceProduct) => string | undefined
  /** Appended only for this provider's model/tool instructions. */
  queryGuidance?: string
  /** Provider-only guidance about how many matching products to display. */
  displayGuidance?: string
  /** Optionally complete a model shortlist from provider-structured evidence.
   * Providers without this hook keep the model's selection unchanged. */
  completeDisplaySelection?: (
    input: CompleteDisplaySelectionInput,
  ) => CommerceProduct[]
}
