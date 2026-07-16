import type {
  CommerceProduct,
  ProductSearchParams,
  ProductDetails,
  CommerceDeps,
} from '@/lib/commerce/types'

/** Shopify Storefront API version (pinned). */
const API_VERSION = '2024-07'

interface ShopifyMoney {
  amount?: string
  currencyCode?: string
}

interface ShopifyProductNode {
  id: string
  title: string
  handle: string
  onlineStoreUrl?: string | null
  availableForSale?: boolean
  description?: string
  featuredImage?: { url?: string } | null
  priceRange?: { minVariantPrice?: ShopifyMoney }
}

interface ShopifyResponse {
  data?: { products?: { edges?: Array<{ node: ShopifyProductNode }> } }
  errors?: unknown
}

const SEARCH_QUERY = `query Search($q: String!, $first: Int!) {
  products(first: $first, query: $q) {
    edges {
      node {
        id
        title
        handle
        onlineStoreUrl
        availableForSale
        description
        featuredImage { url }
        priceRange { minVariantPrice { amount currencyCode } }
      }
    }
  }
}`

/** Strip protocol/trailing slash → bare myshopify (or custom) domain. */
export function shopifyDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '')
}

export function formatShopifyMoney(money: ShopifyMoney | undefined): string {
  if (!money?.amount) return ''
  const n = Number(money.amount)
  const value = Number.isFinite(n) ? n.toFixed(2) : money.amount
  return money.currencyCode ? `${value} ${money.currencyCode}` : value
}

function truncate(text: string | undefined, max: number): string | undefined {
  if (!text) return undefined
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return undefined
  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…'
}

export function normalizeShopifyProduct(node: ShopifyProductNode, domain: string): CommerceProduct {
  return {
    id: node.id,
    title: node.title,
    price: formatShopifyMoney(node.priceRange?.minVariantPrice),
    url: node.onlineStoreUrl || `https://${shopifyDomain(domain)}/products/${node.handle}`,
    imageUrl: node.featuredImage?.url ?? undefined,
    inStock: node.availableForSale !== false,
    shortDescription: truncate(node.description, 280),
  }
}

async function storefront(
  domain: string,
  token: string,
  query: string,
  variables: Record<string, unknown>,
  deps: CommerceDeps,
): Promise<ShopifyResponse> {
  const fetchImpl = deps.fetchImpl ?? fetch
  const res = await fetchImpl(`https://${shopifyDomain(domain)}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify Storefront error: HTTP ${res.status}`)
  return (await res.json()) as ShopifyResponse
}

/**
 * Product search via the Shopify Storefront GraphQL API. Price filters aren't
 * applied (the Storefront query grammar is limited) — the agent curates results.
 */
export async function searchShopifyProducts(
  domain: string,
  token: string,
  params: ProductSearchParams,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const first = Math.min(params.limit ?? 10, 20)
  const json = await storefront(domain, token, SEARCH_QUERY, { q: params.query, first }, deps)
  const edges = json.data?.products?.edges ?? []
  return edges.map((e) => normalizeShopifyProduct(e.node, domain))
}

const COLLECTION_QUERY = `query Collection($handle: String!, $first: Int!) {
  collection(handle: $handle) {
    products(first: $first) {
      edges {
        node {
          id
          title
          handle
          onlineStoreUrl
          availableForSale
          description
          featuredImage { url }
          priceRange { minVariantPrice { amount currencyCode } }
        }
      }
    }
  }
}`

/** List a collection's products from its page URL (…/collections/<handle>). */
export async function listShopifyCollectionProducts(
  domain: string,
  token: string,
  pageUrl: string,
  limit: number,
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  const m = /\/collections\/([^/?#]+)/.exec(pageUrl)
  const handle = m?.[1] ? decodeURIComponent(m[1]) : ''
  if (!handle) return []
  const json = (await storefront(domain, token, COLLECTION_QUERY, {
    handle,
    first: Math.min(limit, 24),
  }, deps)) as unknown as {
    data?: { collection?: { products?: { edges?: Array<{ node: ShopifyProductNode }> } } }
  }
  const edges = json.data?.collection?.products?.edges ?? []
  return edges.map((e) => normalizeShopifyProduct(e.node, domain))
}

const NODES_QUERY = `query Nodes($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      title
      handle
      onlineStoreUrl
      availableForSale
      description
      featuredImage { url }
      priceRange { minVariantPrice { amount currencyCode } }
    }
  }
}`

interface ShopifyNodesResponse {
  data?: { nodes?: Array<ShopifyProductNode | null> }
  errors?: unknown
}

/**
 * Fetch products by Storefront GID for LIVE price/stock hydration of the
 * semantic index (which intentionally stores no prices).
 */
export async function fetchShopifyProductsByIds(
  domain: string,
  token: string,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<CommerceProduct[]> {
  if (ids.length === 0) return []
  const json = (await storefront(domain, token, NODES_QUERY, { ids }, deps)) as ShopifyNodesResponse
  return (json.data?.nodes ?? [])
    .filter((n): n is ShopifyProductNode => Boolean(n?.id))
    .map((n) => normalizeShopifyProduct(n, domain))
}

const DETAILS_QUERY = `query Details($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      title
      description
      options { name values }
    }
  }
}`

interface ShopifyDetailsNode {
  id: string
  title: string
  description?: string
  options?: Array<{ name?: string; values?: string[] }>
}

interface ShopifyDetailsResponse {
  data?: { nodes?: Array<ShopifyDetailsNode | null> }
  errors?: unknown
}

/**
 * Full live details for up to a few products by Storefront GID: the complete
 * plain-text description (capped) plus option lines like "Color: Red, Blue" —
 * for the model to answer depth questions, never rendered as cards.
 */
export async function fetchShopifyProductDetails(
  domain: string,
  token: string,
  ids: string[],
  deps: CommerceDeps = {},
): Promise<ProductDetails[]> {
  if (ids.length === 0) return []
  const json = (await storefront(domain, token, DETAILS_QUERY, { ids }, deps)) as ShopifyDetailsResponse
  return (json.data?.nodes ?? [])
    .filter((n): n is ShopifyDetailsNode => Boolean(n?.id))
    .map((n) => {
      const attributes = (n.options ?? [])
        // Variant-less products carry a synthetic "Title: Default Title" option.
        .filter((o) => o.name && o.name !== 'Title' && (o.values ?? []).length)
        .map((o) => `${o.name}: ${(o.values ?? []).join(', ')}`)
      return {
        id: n.id,
        title: n.title,
        description: truncate(n.description, 1500),
        ...(attributes.length ? { attributes } : {}),
      }
    })
}

/** Connectivity/credential check. `total` is a best-effort (0/1) — Storefront has no count. */
export async function validateShopifyStore(
  domain: string,
  token: string,
  deps: CommerceDeps = {},
): Promise<{ ok: boolean; total: number }> {
  try {
    const json = await storefront(
      domain,
      token,
      'query { products(first: 1) { edges { node { id } } } }',
      {},
      deps,
    )
    if (json.errors) return { ok: false, total: 0 }
    return { ok: true, total: json.data?.products?.edges?.length ?? 0 }
  } catch {
    return { ok: false, total: 0 }
  }
}
