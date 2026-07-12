import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { Audience } from './catalog'
import { embedOne } from '@/lib/ai/embeddings'
import { searchStore } from '@/lib/commerce'
import { storeOrigin, normalizeWooProduct } from '@/lib/commerce/woocommerce'
import { fetchShopifyProductsByIds } from '@/lib/commerce/shopify'
import { fetchMagentoProductsBySkus } from '@/lib/commerce/magento'

export interface SearchOptions {
  /** Restrict to this recipient (plus unisex) — e.g. 'men' for "gifts for men". */
  audience?: Audience
}

/**
 * The indexed doc, trimmed for the model: drop the first line (the title — the
 * product already carries it) and cap the rest. What remains is the comparison
 * material: audience, categories, tags, attributes, longer description.
 */
export function docToDetails(doc: string | null | undefined): string | undefined {
  if (!doc) return undefined
  const rest = doc.split('\n').slice(1).join('\n').trim()
  return rest ? rest.slice(0, 400) : undefined
}

/** Whether this bot has a synced semantic product index. */
async function hasIndex(botId: string, db: SupabaseClient): Promise<boolean> {
  const { count } = await db
    .from('product_embeddings')
    .select('id', { count: 'exact', head: true })
    .eq('bot_id', botId)
  return (count ?? 0) > 0
}

/** Hydrate WooCommerce products by id with LIVE price/stock (never stale). */
async function hydrateWoo(storeUrl: string, ids: string[]): Promise<Map<string, CommerceProduct>> {
  const map = new Map<string, CommerceProduct>()
  if (ids.length === 0) return map
  const base = storeOrigin(storeUrl)
  const res = await fetch(
    `${base}/wp-json/wc/store/v1/products?include=${ids.join(',')}&per_page=${ids.length}`,
  )
  if (!res.ok) return map
  const rows = (await res.json()) as Parameters<typeof normalizeWooProduct>[0][]
  for (const p of rows) {
    const n = normalizeWooProduct(p)
    map.set(n.id, n)
  }
  return map
}

type Commerce = NonNullable<Bot['config']['commerce']>

/** True when the provider supports a synced semantic index + live hydration. */
export function semanticIndexSupported(c: Commerce): boolean {
  if (c.provider === 'woocommerce') return Boolean(c.storeUrl)
  if (c.provider === 'shopify') return Boolean(c.shopifyDomain && c.shopifyToken)
  if (c.provider === 'magento') return Boolean(c.storeUrl)
  return false // 'feed' has no live price/stock API to hydrate from
}

/** Live price/stock hydration for semantic matches, keyed by the index's external_id. */
async function hydrateLive(c: Commerce, ids: string[]): Promise<Map<string, CommerceProduct>> {
  if (c.provider === 'woocommerce') return hydrateWoo(c.storeUrl, ids)
  const map = new Map<string, CommerceProduct>()
  const products =
    c.provider === 'shopify'
      ? await fetchShopifyProductsByIds(c.shopifyDomain!, c.shopifyToken!, ids)
      : await fetchMagentoProductsBySkus(c.storeUrl, ids)
  for (const p of products) map.set(p.id, p)
  return map
}

/**
 * Product search for a bot: semantic (concept-level) match against the synced
 * index, hydrated with LIVE prices/stock — falls back to live keyword search
 * when there's no index or the semantic path finds nothing.
 */
export async function searchCatalog(
  bot: Bot,
  query: string,
  db: SupabaseClient,
  limit = 8,
  opts: SearchOptions = {},
): Promise<CommerceProduct[]> {
  const c = bot.config.commerce
  if (!c?.enabled) return []

  try {
    if (semanticIndexSupported(c) && (await hasIndex(bot.id, db))) {
      const embedding = await embedOne(query)
      const { data } = await db.rpc('match_products', {
        p_bot_id: bot.id,
        p_embedding: embedding,
        p_query_text: query,
        p_k: limit,
        // 'unisex' means "no specific recipient" — filtering BY it would exclude
        // women/men/kids-tagged items (the model sends it unprompted).
        p_audience: !opts.audience || opts.audience === 'unisex' ? null : opts.audience,
      })
      const matches = (data ?? []) as { external_id: string; doc?: string | null }[]
      if (matches.length) {
        const live = await hydrateLive(
          c,
          matches.map((m) => m.external_id),
        )
        // Semantic matches exist but the store API returned nothing → the store
        // is unreachable, not out of stock. Surface that instead of letting the
        // keyword fallback hit the same dead store and read as "unavailable".
        if (live.size === 0) throw new Error('product hydration failed: store API unreachable')
        // Preserve semantic rank order; keep only in-stock, live-priced products.
        // Carry the indexed doc along as `details` so the model can discuss and
        // compare (attributes/categories/description beyond the live short one).
        const products = matches
          .map((m): CommerceProduct | undefined => {
            const p = live.get(m.external_id)
            return p ? { ...p, details: docToDetails(m.doc) } : undefined
          })
          .filter((p): p is CommerceProduct => Boolean(p) && p!.inStock)
        if (products.length) return products
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('product hydration failed')) throw err
    // Semantic index errors (RPC/embedding) → log and fall back to keyword search.
    console.error('[agent] semantic product search failed, falling back to keyword:', err)
  }

  return searchStore(c, { query, limit })
}
