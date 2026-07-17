import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { Audience } from './catalog'
import { embedOne } from '@/lib/ai/embeddings'
import { searchStore, listStoreProductsByUrl } from '@/lib/commerce'
import {
  commerceProviderProfile,
  type IndexedProductMatch,
} from './provider-profiles'

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

type Commerce = NonNullable<Bot['config']['commerce']>

/** True when the provider supports a synced semantic index + live hydration. */
export function semanticIndexSupported(c: Commerce): boolean {
  const semantic = commerceProviderProfile(c).semantic
  return Boolean(semantic?.configured(c))
}

/** "…/produkto-zyma/natalijos-hitas/" → "natalijos hitas" (search fallback for URLs). */
function urlSlugWords(url: string): string {
  try {
    const segs = new URL(url).pathname.split('/').filter(Boolean)
    return decodeURIComponent(segs[segs.length - 1] ?? '').replace(/[-_+]+/g, ' ').trim()
  } catch {
    return ''
  }
}

/**
 * Product search for a bot: semantic (concept-level) match against the synced
 * index, hydrated with LIVE prices/stock — falls back to live keyword search
 * when there's no index or the semantic path finds nothing.
 *
 * A store page URL as the query (category/tag/collection) lists that page's
 * products directly via the provider; when the provider can't resolve it, the
 * URL's slug words become the search query instead.
 */
export async function searchCatalog(
  bot: Pick<Bot, 'id' | 'config'>,
  rawQuery: string,
  db: SupabaseClient,
  limit = 8,
  opts: SearchOptions = {},
): Promise<CommerceProduct[]> {
  const c = bot.config.commerce
  if (!c?.enabled) return []

  let query = rawQuery.trim()
  if (/^https?:\/\//i.test(query)) {
    try {
      const listed = await listStoreProductsByUrl(c, query, Math.max(limit, 12))
      const inStock = listed.filter((p) => p.inStock)
      if (inStock.length) return inStock
    } catch (err) {
      console.error('[agent] listing products by URL failed, falling back to search:', err)
    }
    query = urlSlugWords(query) || query
  }

  try {
    const semantic = commerceProviderProfile(c).semantic
    if (semantic?.configured(c) && (await hasIndex(bot.id, db))) {
      const semanticQuery = semantic.normalizeQuery?.(query) ?? query
      const embedding = await embedOne(semanticQuery)
      const candidatePoolSize = semantic.candidatePoolSize?.(limit) ?? limit
      const { data } = await db.rpc(semantic.matcherRpc, {
        p_bot_id: bot.id,
        p_embedding: embedding,
        p_query_text: semanticQuery,
        p_k: candidatePoolSize,
        // 'unisex' means "no specific recipient" — filtering BY it would exclude
        // women/men/kids-tagged items (the model sends it unprompted).
        p_audience: !opts.audience || opts.audience === 'unisex' ? null : opts.audience,
      })
      const matches = (data ?? []) as IndexedProductMatch[]
      if (matches.length) {
        // Provider profiles own any store/index compatibility checks. This keeps
        // a provider's edge case out of the shared retrieval path.
        if (semantic.acceptsIndex && !semantic.acceptsIndex(c, matches)) {
          console.warn(`[agent] ${c.provider} index is incompatible; using live search`)
        } else {
          const live = await semantic.hydrate(c, matches)
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
          if (products.length) return products.slice(0, limit)
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('product hydration failed')) throw err
    // Semantic index errors (RPC/embedding) → log and fall back to keyword search.
    console.error('[agent] semantic product search failed, falling back to keyword:', err)
  }

  return searchStore(c, { query, limit })
}
