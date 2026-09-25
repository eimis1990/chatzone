import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { discoverPages, isProductUrl, pageKey, pageName, priorityScore } from '@/lib/ingestion/crawl'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { createRateLimiter } from '@/lib/ratelimit'
import type { KnowledgeSource } from '@/lib/types'

/**
 * Plans a website sync: re-discovers the bot's site (sitemap → links), adds any
 * pages it doesn't have yet as pending URL sources, and returns every URL source
 * to refresh. The client then refreshes them one by one through
 * `/api/ingest { refresh: true }` (progress for free, and no single request has
 * to outlive a 200-page site), then rebuilds the answer summaries.
 */

// Sitemap discovery only (no page fetches); new pages per sync are capped so a
// huge site isn't swallowed in one go — the next sync adds the rest.
export const maxDuration = 60
const DISCOVER_CAP = 1000
const NEW_CAP = 25

const bodySchema = z.object({ botId: z.string().uuid() })
const limiter = createRateLimiter({ capacity: 2, refillPerSec: 0.05 })

/** The site to sync: the origin most of the bot's URL sources live on. */
function siteOrigin(urls: string[]): string | null {
  const tally = new Map<string, number>()
  for (const u of urls) {
    try {
      const o = new URL(u).origin
      tally.set(o, (tally.get(o) ?? 0) + 1)
    } catch {
      // skip malformed
    }
  }
  return [...tally].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
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
  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: existing } = await supabase
    .from('knowledge_sources')
    .select('id, metadata')
    .eq('bot_id', botId)
    .eq('type', 'url')
    .order('created_at')
  const rows = (existing ?? []).map((r) => ({ id: r.id as string, url: String((r.metadata as { url?: string })?.url ?? '') }))
  const origin = siteOrigin(rows.map((r) => r.url))
  if (!origin) {
    return NextResponse.json({ error: 'No website pages to sync yet — add your site first.' }, { status: 422 })
  }

  try {
    await assertPublicUrl(origin)
  } catch {
    return NextResponse.json({ error: 'That site is not allowed.' }, { status: 400 })
  }

  const known = new Set(rows.map((r) => pageKey(r.url)))
  const fresh = (await discoverPages(`${origin}/`, DISCOVER_CAP))
    .filter((p) => !known.has(pageKey(p)) && !isProductUrl(p))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
  const toAdd = fresh.slice(0, NEW_CAP)

  const added: KnowledgeSource[] = []
  for (const pageUrl of toAdd) {
    const { data: src } = await supabase
      .from('knowledge_sources')
      .insert({ bot_id: botId, type: 'url', name: pageName(pageUrl), status: 'pending', metadata: { url: pageUrl } })
      .select('*')
      .single<KnowledgeSource>()
    if (src) added.push(src)
  }

  return NextResponse.json({
    // New pages first: they're what the owner is usually syncing for.
    sourceIds: [...added.map((s) => s.id), ...rows.map((r) => r.id)],
    added,
    remaining: fresh.length - toAdd.length,
  })
}
