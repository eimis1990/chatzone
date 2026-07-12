import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import { embed } from '@/lib/ai/embeddings'
import {
  fetchWooCatalog,
  fetchShopifyCatalog,
  fetchMagentoCatalog,
  deriveTags,
  deriveAudience,
  buildDoc,
  type RawProduct,
} from './catalog'
import { aiEnrich } from './enrich'

/** A stage of the sync, reported for the live progress UI. */
export interface SyncProgress {
  phase: 'fetching' | 'enriching' | 'embedding' | 'indexing' | 'done'
  processed?: number
  total?: number
  synced?: number
}

/**
 * Sync a bot's store catalog into the semantic product index: fetch → tag
 * (derived + AI) → embed → replace. A full refresh (delete + insert) keeps the
 * index in step with the store, incl. removed products. Prices/stock are NOT
 * stored — they're hydrated live at query time (see lib/products/search).
 *
 * `onProgress` (optional) is called at each phase so the caller can surface a
 * live progress bar; the enrichment phase reports processed/total as it runs.
 */
export async function syncProductCatalog(
  bot: Bot,
  db: SupabaseClient,
  onProgress?: (p: SyncProgress) => void,
): Promise<{ synced: number }> {
  const report = onProgress ?? (() => {})
  const c = bot.config.commerce
  if (!c?.enabled) return { synced: 0 }

  report({ phase: 'fetching' })
  let products: RawProduct[] = []
  if (c.provider === 'woocommerce' && c.storeUrl) {
    products = await fetchWooCatalog(c.storeUrl, fetch, (fetched) =>
      report({ phase: 'fetching', processed: fetched }),
    )
  } else if (c.provider === 'shopify' && c.shopifyDomain && c.shopifyToken) {
    products = await fetchShopifyCatalog(c.shopifyDomain, c.shopifyToken)
  } else if (c.provider === 'magento' && c.storeUrl) {
    products = await fetchMagentoCatalog(c.storeUrl)
  }
  // 'feed' has no live price/stock API to hydrate from — keyword search only.
  if (products.length === 0) {
    report({ phase: 'done', synced: 0 })
    return { synced: 0 }
  }

  report({ phase: 'enriching', processed: 0, total: products.length })
  const ai = await aiEnrich(products, (processed, total) =>
    report({ phase: 'enriching', processed, total }),
  )
  const tagsFor = (p: RawProduct) => [...new Set([...deriveTags(p), ...(ai.get(p.id)?.tags ?? [])])]
  // Explicit store categories win; AI fills the gaps; unknown → 'unisex' (shows
  // for every audience) so we never wrongly hide a genuinely neutral product.
  const audienceFor = (p: RawProduct) => deriveAudience(p.categories) ?? ai.get(p.id)?.audience ?? 'unisex'
  const docs = products.map((p) => buildDoc(p, tagsFor(p), audienceFor(p)))
  report({ phase: 'embedding', processed: 0, total: products.length })
  const embeddings = await embed(docs, (processed, total) =>
    report({ phase: 'embedding', processed, total }),
  )

  const rows = products.map((p, i) => ({
    bot_id: bot.id,
    external_id: p.id,
    title: p.title,
    url: p.url || null,
    image_url: p.imageUrl ?? null,
    tags: tagsFor(p),
    audience: audienceFor(p),
    doc: docs[i],
    embedding: embeddings[i],
  }))

  // Full refresh so the index matches the current catalog.
  report({ phase: 'indexing', processed: 0, total: rows.length })
  await db.from('product_embeddings').delete().eq('bot_id', bot.id)
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('product_embeddings').insert(rows.slice(i, i + 100))
    if (error) throw new Error(`product_embeddings insert failed: ${error.message}`)
    report({ phase: 'indexing', processed: Math.min(i + 100, rows.length), total: rows.length })
  }
  report({ phase: 'done', synced: rows.length })
  return { synced: rows.length }
}
