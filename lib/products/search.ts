import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { Audience } from './catalog'
import { embedOne } from '@/lib/ai/embeddings'
import { searchStore } from '@/lib/commerce'
import { storeOrigin, normalizeWooProduct } from '@/lib/commerce/woocommerce'

export interface SearchOptions {
  /** Restrict to this recipient (plus unisex) — e.g. 'men' for "gifts for men". */
  audience?: Audience
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
    if (c.provider === 'woocommerce' && c.storeUrl && (await hasIndex(bot.id, db))) {
      const embedding = await embedOne(query)
      const { data } = await db.rpc('match_products', {
        p_bot_id: bot.id,
        p_embedding: embedding,
        p_query_text: query,
        p_k: limit,
        p_audience: opts.audience ?? null,
      })
      const matches = (data ?? []) as { external_id: string }[]
      if (matches.length) {
        const live = await hydrateWoo(
          c.storeUrl,
          matches.map((m) => m.external_id),
        )
        // Semantic matches exist but the store API returned nothing → the store
        // is unreachable, not out of stock. Surface that instead of letting the
        // keyword fallback hit the same dead store and read as "unavailable".
        if (live.size === 0) throw new Error('product hydration failed: store API unreachable')
        // Preserve semantic rank order; keep only in-stock, live-priced products.
        const products = matches
          .map((m) => live.get(m.external_id))
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
