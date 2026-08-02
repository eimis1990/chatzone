import type { SupabaseClient } from '@supabase/supabase-js'
import type { Bot } from '@/lib/types'
import { embed } from '@/lib/ai/embeddings'
import {
  deriveTags,
  deriveAudience,
  buildDoc,
  productRawHash,
  type RawProduct,
} from './catalog'
import { aiEnrich, aiColorEnrich, hasMainColorAttribute, type Enrichment } from './enrich'
import { commerceProviderProfile } from './provider-profiles'

/** A stage of the sync, reported for the live progress UI. */
export interface SyncProgress {
  phase: 'fetching' | 'enriching' | 'embedding' | 'indexing' | 'done'
  processed?: number
  total?: number
  synced?: number
}

/** Postgres cancelled the statement (statement_timeout) — 57014. */
function isTimeoutError(error: { message: string; code?: string }): boolean {
  return error.code === '57014' || error.message.includes('statement timeout')
}

/**
 * Run `items` through `run` in chunks, HALVING the chunk size and retrying the
 * same position whenever Postgres reports a statement timeout. Writing
 * 1536-dim vectors pays an HNSW graph-insert per row, so a fixed batch that
 * fits one store blows the statement_timeout on a bigger/busier one — this
 * adapts instead of failing the whole sync. A single row that still times out
 * is a real problem and surfaces as an error.
 */
export async function runChunkedWrite<T>(
  items: T[],
  startSize: number,
  // PromiseLike: supabase query builders are thenables, not real Promises.
  run: (chunk: T[]) => PromiseLike<{ error: { message: string; code?: string } | null }>,
  label: string,
  onDone?: (written: number) => void,
): Promise<void> {
  let i = 0
  let size = startSize
  while (i < items.length) {
    const chunk = items.slice(i, i + size)
    const { error } = await run(chunk)
    if (error) {
      if (isTimeoutError(error) && chunk.length > 1) {
        size = Math.max(1, Math.floor(chunk.length / 2))
        continue // retry the same position with a smaller batch
      }
      throw new Error(`${label} failed: ${error.message}`)
    }
    i += chunk.length
    onDone?.(i)
  }
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
  const profile = commerceProviderProfile(c)
  const products: RawProduct[] = profile.catalogSync?.configured(c)
    ? await profile.catalogSync.fetch(c, (fetched) =>
        report({ phase: 'fetching', processed: fetched }),
      )
    : []
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

  // Providers with rich structured source metadata may opt out of the generic
  // recipient/occasion classifier in their profile. Incremental hashing still
  // makes later syncs cheap.
  const ai = new Map<string, Enrichment>()
  if (profile.catalogSync?.skipAiEnrichment) {
    report({ phase: 'enriching', processed: 0, total: 0 })
  } else {
    report({ phase: 'enriching', processed: 0, total: changed.length })
    const enriched = await aiEnrich(changed, (processed, total) =>
      report({ phase: 'enriching', processed, total }),
    )
    for (const [id, value] of enriched) ai.set(id, value)

    // Photo-derived main color for products whose store data has no color
    // attribute (furniture catalogs often list only fabric codes while the
    // whiteness lives in the photo). Appended as a "Color: …" attribute so the
    // ranking RPC's color field and the model's verification both see it.
    // Runs after the raw hashes were computed, so it never affects the diff.
    const needsColor = changed.filter((p) => p.imageUrl && !hasMainColorAttribute(p.attributes))
    if (needsColor.length) {
      const colors = await aiColorEnrich(needsColor)
      for (const p of needsColor) {
        const c = colors.get(p.id)
        if (c?.length) p.attributes.push(`Color: ${c.join(', ')}`)
      }
    }
  }
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
  // 50 to start (not 100): each timed-out attempt wastes a full statement_timeout
  // waiting for the cancel, so over-large first batches are expensive mistakes.
  await runChunkedWrite(
    rows,
    50,
    (chunk) => db.from('product_embeddings').upsert(chunk, { onConflict: 'bot_id,external_id' }),
    'product_embeddings upsert',
    (written) => report({ phase: 'indexing', processed: written, total: totalWork }),
  )
  // Unchanged rows just get their stamp bumped so the prune below keeps them.
  await runChunkedWrite(
    unchangedIds,
    200,
    (chunk) =>
      db
        .from('product_embeddings')
        .update({ synced_at: startedAt })
        .eq('bot_id', bot.id)
        .in('external_id', chunk),
    'product_embeddings bump',
    (written) => report({ phase: 'indexing', processed: rows.length + written, total: totalWork }),
  )
  // Remove products no longer in the catalog (rows this run didn't touch).
  await db.from('product_embeddings').delete().eq('bot_id', bot.id).lt('synced_at', startedAt)
  report({ phase: 'done', synced: products.length })
  return { synced: products.length }
}
