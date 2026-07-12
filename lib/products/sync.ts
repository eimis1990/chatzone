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
  productRawHash,
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
 * (derived + AI) → embed → upsert + prune. The upsert-then-prune order keeps
 * the old index intact if the run dies mid-way (serverless timeout), while
 * still removing products that left the store. Prices/stock are NOT
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

  // Incremental diff: skip AI enrichment + embedding for products whose raw
  // inputs match the stored hash — a full re-enrich of a big catalog blows the
  // serverless time budget (504). First sync (no hashes) processes everything.
  const existing = new Map<string, string | null>()
  for (let from = 0; ; from += 1000) {
    const { data: page } = await db
      .from('product_embeddings')
      .select('external_id, raw_hash')
      .eq('bot_id', bot.id)
      .range(from, from + 999)
    for (const r of page ?? []) existing.set(r.external_id as string, r.raw_hash as string | null)
    if (!page || page.length < 1000) break
  }
  const hashes = new Map(products.map((p) => [p.id, productRawHash(p)]))
  const changed = products.filter((p) => existing.get(p.id) !== hashes.get(p.id))
  const unchangedIds = products.filter((p) => !changed.includes(p)).map((p) => p.id)

  report({ phase: 'enriching', processed: 0, total: changed.length })
  const ai = await aiEnrich(changed, (processed, total) =>
    report({ phase: 'enriching', processed, total }),
  )
  const tagsFor = (p: RawProduct) => [...new Set([...deriveTags(p), ...(ai.get(p.id)?.tags ?? [])])]
  // Explicit store categories win; AI fills the gaps; unknown → 'unisex' (shows
  // for every audience) so we never wrongly hide a genuinely neutral product.
  const audienceFor = (p: RawProduct) => deriveAudience(p.categories) ?? ai.get(p.id)?.audience ?? 'unisex'
  const docs = changed.map((p) => buildDoc(p, tagsFor(p), audienceFor(p)))
  report({ phase: 'embedding', processed: 0, total: changed.length })
  const embeddings = await embed(docs, (processed, total) =>
    report({ phase: 'embedding', processed, total }),
  )

  // Stamp every row with this run's time — the stamp doubles as the prune key.
  const startedAt = new Date().toISOString()
  const rows = changed.map((p, i) => ({
    bot_id: bot.id,
    external_id: p.id,
    title: p.title,
    url: p.url || null,
    image_url: p.imageUrl ?? null,
    tags: tagsFor(p),
    audience: audienceFor(p),
    doc: docs[i],
    embedding: embeddings[i],
    raw_hash: hashes.get(p.id),
    synced_at: startedAt,
  }))

  // Upsert-then-prune (NOT delete-then-insert): if the run is killed mid-way
  // (serverless timeout), the old index stays intact instead of being wiped —
  // a 504 once left a bot searching 400 of 2,582 products.
  const totalWork = rows.length + unchangedIds.length
  report({ phase: 'indexing', processed: 0, total: totalWork })
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db
      .from('product_embeddings')
      .upsert(rows.slice(i, i + 100), { onConflict: 'bot_id,external_id' })
    if (error) throw new Error(`product_embeddings upsert failed: ${error.message}`)
    report({ phase: 'indexing', processed: Math.min(i + 100, rows.length), total: totalWork })
  }
  // Unchanged rows just get their stamp bumped so the prune below keeps them.
  for (let i = 0; i < unchangedIds.length; i += 200) {
    const { error } = await db
      .from('product_embeddings')
      .update({ synced_at: startedAt })
      .eq('bot_id', bot.id)
      .in('external_id', unchangedIds.slice(i, i + 200))
    if (error) throw new Error(`product_embeddings bump failed: ${error.message}`)
    report({
      phase: 'indexing',
      processed: rows.length + Math.min(i + 200, unchangedIds.length),
      total: totalWork,
    })
  }
  // Remove products no longer in the catalog (rows this run didn't touch).
  await db.from('product_embeddings').delete().eq('bot_id', bot.id).lt('synced_at', startedAt)
  report({ phase: 'done', synced: products.length })
  return { synced: products.length }
}
