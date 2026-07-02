import { createServiceClient } from '@/lib/supabase/service'
import { syncProductCatalog } from '@/lib/products/sync'
import { semanticIndexSupported } from '@/lib/products/search'
import type { Bot } from '@/lib/types'

export const maxDuration = 300

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

  const svc = createServiceClient()
  const { data: bots } = await svc.from('bots').select('*').eq('status', 'active')

  const results: Record<string, string> = {}
  for (const bot of (bots ?? []) as Bot[]) {
    const c = bot.config.commerce
    if (!c?.enabled || !semanticIndexSupported(c)) continue
    const { count } = await svc
      .from('product_embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot.id)
    if (!count) continue // no index yet — first sync is manual
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
