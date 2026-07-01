import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import { embed } from '@/lib/ai/embeddings'
import { fetchWooCatalog, deriveTags, buildDoc, type RawProduct } from './catalog'
import { aiTags } from './enrich'

/**
 * Sync a bot's store catalog into the semantic product index: fetch → tag
 * (derived + AI) → embed → replace. A full refresh (delete + insert) keeps the
 * index in step with the store, incl. removed products. Prices/stock are NOT
 * stored — they're hydrated live at query time (see lib/products/search).
 */
export async function syncProductCatalog(
  bot: Bot,
  db: SupabaseClient,
): Promise<{ synced: number }> {
  const c = bot.config.commerce
  if (!c?.enabled) return { synced: 0 }

  let products: RawProduct[] = []
  if (c.provider === 'woocommerce' && c.storeUrl) {
    products = await fetchWooCatalog(c.storeUrl)
  }
  // Shopify/Magento/feed catalog sync: future — keyword search still works.
  if (products.length === 0) return { synced: 0 }

  const ai = await aiTags(products)
  const tagsFor = (p: RawProduct) => [...new Set([...deriveTags(p), ...(ai.get(p.id) ?? [])])]
  const docs = products.map((p) => buildDoc(p, tagsFor(p)))
  const embeddings = await embed(docs)

  const rows = products.map((p, i) => ({
    bot_id: bot.id,
    external_id: p.id,
    title: p.title,
    url: p.url || null,
    image_url: p.imageUrl ?? null,
    tags: tagsFor(p),
    doc: docs[i],
    embedding: embeddings[i],
  }))

  // Full refresh so the index matches the current catalog.
  await db.from('product_embeddings').delete().eq('bot_id', bot.id)
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('product_embeddings').insert(rows.slice(i, i + 100))
    if (error) throw new Error(`product_embeddings insert failed: ${error.message}`)
  }
  return { synced: rows.length }
}
