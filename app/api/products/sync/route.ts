import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncProductCatalog } from '@/lib/products/sync'
import { validateStore } from '@/lib/commerce'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot } from '@/lib/types'

// Fetching + AI-tagging + embedding a catalog takes a while.
export const maxDuration = 300

const bodySchema = z.object({ botId: z.string().uuid() })
// Syncing is expensive — a couple per few minutes per user.
const limiter = createRateLimiter({ capacity: 2, refillPerSec: 0.02 })

/**
 * Index status for the configurator: how many products are indexed vs. the
 * store's catalog size, and when the last sync ran (manual or nightly cron).
 */
export async function GET(req: Request) {
  const botId = new URL(req.url).searchParams.get('botId')
  if (!botId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // RLS: a missing bot row means the user can't manage it.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
  if (!bot?.config.commerce?.enabled) {
    return NextResponse.json({ indexed: 0, storeTotal: 0, lastSyncedAt: null })
  }

  const [{ count: indexed }, { data: latest }] = await Promise.all([
    svc.from('product_embeddings').select('id', { count: 'exact', head: true }).eq('bot_id', botId),
    svc
      .from('product_embeddings')
      .select('synced_at')
      .eq('bot_id', botId)
      .order('synced_at', { ascending: false })
      .limit(1),
  ])
  // Store size is best-effort: Woo reports a real total; Shopify has no count API.
  let storeTotal = 0
  try {
    const v = await validateStore(bot.config.commerce)
    if (v.ok) storeTotal = v.total
  } catch {
    /* store unreachable — show the indexed count alone */
  }
  return NextResponse.json({
    indexed: indexed ?? 0,
    storeTotal,
    lastSyncedAt: latest?.[0]?.synced_at ?? null,
  })
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { botId } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Please wait a moment before syncing again.' }, { status: 429 })
  }

  // RLS: a missing bot row means the user can't manage it.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const writeStatus = (fields: Record<string, unknown>) =>
    svc
      .from('catalog_sync_status')
      .upsert({ bot_id: botId, ...fields, updated_at: new Date().toISOString() })

  // Persist progress for the live UI, but throttle DB writes: always write a
  // phase change (and 'done'), otherwise at most ~every 800ms.
  let lastPhase = ''
  let lastWrite = 0
  await writeStatus({ phase: 'fetching', processed: 0, total: 0, synced: 0, error: null })

  try {
    const { synced } = await syncProductCatalog(bot, svc, (p) => {
      const now = Date.now()
      if (p.phase === lastPhase && now - lastWrite < 800) return
      lastPhase = p.phase
      lastWrite = now
      void writeStatus({
        phase: p.phase,
        processed: p.processed ?? 0,
        total: p.total ?? 0,
        synced: p.synced ?? 0,
      })
    })
    await writeStatus({ phase: 'done', synced, processed: synced, total: synced, error: null })
    return NextResponse.json({ synced })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    await writeStatus({ phase: 'error', error: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
