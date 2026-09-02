import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'
import type { Audience } from './catalog'
import { embedOne } from '@/lib/ai/embeddings'
import { searchStore, listStoreProductsByUrl } from '@/lib/commerce'
import { applyProductSearchSynonyms } from '@/lib/products/synonyms'
import {
  commerceProviderProfile,
  type IndexedProductMatch,
} from './provider-profiles'

export interface SearchOptions {
  /** Restrict to this recipient (plus unisex) — e.g. 'men' for "gifts for men". */
  audience?: Audience
  /** Price ordering for superlative asks ("cheapest product"). The semantic
   *  index stores no prices, so a sort always routes to the live keyword path. */
  sort?: 'price_asc' | 'price_desc'
}

/**
 * The indexed doc, trimmed for the model: drop the first line (the title — the
 * product already carries it) and cap the rest. What remains is the comparison
 * material: attributes, audience, categories, tags, longer description.
 * Attributes go FIRST — they carry the facts hard constraints are verified
 * against (color, material, dimensions), and long category/tag lines used to
 * push them past the cap (half of baldaila.lt's sofas lost their color line).
 */
export function docToDetails(doc: string | null | undefined): string | undefined {
  if (!doc) return undefined
  const lines = doc.split('\n').slice(1)
  const attrs = lines.filter((l) => l.startsWith('Attributes:'))
  const rest = lines.filter((l) => !l.startsWith('Attributes:'))
  const out = [...attrs, ...rest].join('\n').trim()
  return out ? out.slice(0, 600) : undefined
}

/** Whether this bot has a synced semantic product index. */
async function hasIndex(botId: string, db: SupabaseClient): Promise<boolean> {
  // Existence, not a count: an exact count walks every row of the bot's
  // catalog (636ms observed on 2.5k products); one row is enough.
  const { data } = await db.from('product_embeddings').select('id').eq('bot_id', botId).limit(1)
  return (data?.length ?? 0) > 0
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
  // A store page URL anywhere in the query (owners often write "show products
  // from this page <url>") → list that page's products directly, first 20 by
  // default, in the store's own order.
  const pageUrl = query.match(/https?:\/\/\S+/i)?.[0]?.replace(/[)\]>,.;!?]+$/, '')
  if (pageUrl) {
    try {
      const listed = await listStoreProductsByUrl(c, pageUrl, Math.max(limit, 20))
      const inStock = listed.filter((p) => p.inStock)
      if (inStock.length) return inStock
    } catch (err) {
      console.error('[agent] listing products by URL failed, falling back to search:', err)
    }
    query = urlSlugWords(pageUrl) || query
  }

  // One `[agent] search_products timing` line per call — each tool step is a
  // full model round trip on top of this, so know which half is slow.
  const t0 = performance.now()
  const marks: string[] = []
  const mark = (label: string, since: number) => marks.push(`${label}=${Math.round(performance.now() - since)}ms`)
  const logTiming = (path: string, n: number) =>
    console.log(
      `[agent] search_products timing path=${path} results=${n} total=${Math.round(performance.now() - t0)}ms ${marks.join(' ')}`,
    )

  let t = performance.now()
  query = await applyProductSearchSynonyms(db, bot.id, query)
  mark('synonyms', t)

  // Whole-catalog superlatives ("cheapest product", empty query) need the
  // store's own price ordering — the semantic index stores no prices ("cheapest
  // product" once answered with a 10.90 € hand cream while a 0.20 € item
  // existed). With a QUERY present we keep the semantic path and price-order
  // its results below: the model volunteers `sort` on ordinary searches (like
  // it does `audience`), and the live keyword path can't match Lithuanian
  // inflections ("keptuvė" finds nothing though "keptuvių rinkinys" exists).
  if (opts.sort && !query) return searchStore(c, { query, limit, sort: opts.sort })

  try {
    const semantic = commerceProviderProfile(c).semantic
    if (semantic?.configured(c)) {
      const semanticQuery = semantic.normalizeQuery?.(query) ?? query
      // The index check and the query embedding are independent — run both at
      // once. A bot without an index wastes one cheap embedding call.
      t = performance.now()
      const [indexed, embedding] = await Promise.all([hasIndex(bot.id, db), embedOne(semanticQuery)])
      mark('hasIndex+embed', t)
      if (indexed) {
        const candidatePoolSize = semantic.candidatePoolSize?.(limit) ?? limit
        t = performance.now()
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
        mark('match', t)
        if (matches.length) {
          // Provider profiles own any store/index compatibility checks. This keeps
          // a provider's edge case out of the shared retrieval path.
          if (semantic.acceptsIndex && !semantic.acceptsIndex(c, matches)) {
            console.warn(`[agent] ${c.provider} index is incompatible; using live search`)
          } else {
            t = performance.now()
            const live = await semantic.hydrate(c, matches)
            mark('hydrate', t)
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
            if (products.length) {
              logTiming('semantic', products.length)
              return sortByPrice(products.slice(0, limit), opts.sort)
            }
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('product hydration failed')) throw err
    // Semantic index errors (RPC/embedding) → log and fall back to keyword search.
    console.error('[agent] semantic product search failed, falling back to keyword:', err)
  }

  t = performance.now()
  const keyword = await searchStore(c, { query, limit })
  mark('keyword', t)
  logTiming('keyword', keyword.length)
  return sortByPrice(keyword, opts.sort)
}

/** Numeric value of a display price ("99.00 €", "3,99 €"); NaN when unparseable. */
function parsePrice(price: string): number {
  const m = price.replace(',', '.').match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : NaN
}

/** Price-order hydrated results (unparseable prices last); no sort → unchanged. */
function sortByPrice(products: CommerceProduct[], sort?: 'price_asc' | 'price_desc'): CommerceProduct[] {
  if (!sort) return products
  const dir = sort === 'price_desc' ? -1 : 1
  return [...products].sort((a, b) => {
    const pa = parsePrice(a.price)
    const pb = parsePrice(b.price)
    if (Number.isNaN(pa)) return 1
    if (Number.isNaN(pb)) return -1
    return (pa - pb) * dir
  })
}
