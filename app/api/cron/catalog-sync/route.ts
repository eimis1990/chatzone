import { createServiceClient } from '@/lib/supabase/service'
import { syncProductCatalog } from '@/lib/products/sync'
import { semanticIndexSupported } from '@/lib/products/search'
import type { Bot } from '@/lib/types'

export const maxDuration = 300

// Never START another bot's sync after this much elapsed time — leaves room
// for the in-flight bot to finish inside maxDuration instead of being killed.
// ponytail: single time-boxed nightly run; split into per-bot invocations if
// the fleet outgrows a full rotation every ~3 nights.
const START_BUDGET_MS = 240_000

/**
 * Nightly catalog re-sync (Vercel Cron) so the semantic product index tracks the
 * live store (new products, renamed titles, category/attribute changes) without
 * anyone pressing "Sync catalog". Only bots that ALREADY have an index are
 * refreshed — the first sync stays an explicit owner action.
 */
export async function GET(req: Request) {
  // Fail CLOSED: service-role, cross-tenant job — never run for anonymous callers.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedMs = Date.now()
  const svc = createServiceClient()
  const { data: bots } = await svc.from('bots').select('*').eq('status', 'active')

  // Stalest index first. A serial full-fleet pass can exceed the function's
  // time budget (one big WooCommerce store alone takes ~3 min), and list-order
  // processing silently starved the tail bots for weeks — karakara.lt's index
  // sat 16 days stale while the first two bots synced every night. Ordering by
  // last sync + deferring cleanly makes the fleet rotate: whoever is skipped
  // tonight is first tomorrow.
  const eligible: { bot: Bot; lastSyncedAt: string }[] = []
  for (const bot of (bots ?? []) as Bot[]) {
    const c = bot.config.commerce
    if (!c?.enabled || !semanticIndexSupported(c)) continue
    const { data: latest } = await svc
      .from('product_embeddings')
      .select('synced_at')
      .eq('bot_id', bot.id)
      .order('synced_at', { ascending: false })
      .limit(1)
    if (!latest?.length) continue // no index yet — first sync is manual
    eligible.push({ bot, lastSyncedAt: (latest[0].synced_at as string) ?? '' })
  }
  eligible.sort((a, b) => a.lastSyncedAt.localeCompare(b.lastSyncedAt))

  const results: Record<string, string> = {}
  for (const { bot } of eligible) {
    // Don't START a sync near the deadline. A bot killed mid-sync is not a
    // disaster (upsert-then-prune keeps its old index and partial progress
    // shrinks the next diff), but a clean defer keeps the logs honest.
    if (Date.now() - startedMs > START_BUDGET_MS) {
      results[bot.id] = 'deferred (time budget) — first in line tomorrow'
      continue
    }
    try {
      const { synced } = await syncProductCatalog(bot, svc)
      results[bot.id] = `synced ${synced}`
    } catch (err) {
      console.error(`[cron] catalog sync failed for bot ${bot.id}:`, err)
      results[bot.id] = 'error'
    }
  }
  return Response.json({ ok: true, results })
}
