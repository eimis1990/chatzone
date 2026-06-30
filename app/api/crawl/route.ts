import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import { discoverPages } from '@/lib/ingestion/crawl'
import { crawlSchema } from '@/lib/validation/schemas'
import { createRateLimiter } from '@/lib/ratelimit'
import type { KnowledgeSource } from '@/lib/types'

// Discovery + ingesting several pages takes a while; ingestion runs inline so it
// completes regardless of the client.
export const maxDuration = 300

// Discover broadly, but only ingest a batch per crawl (bounds the request time;
// re-crawling picks up the next batch of fresh pages).
const DISCOVER_CAP = 60
const INGEST_CAP = 10

// Crawling is expensive — a couple per minute per user.
const crawlLimiter = createRateLimiter({ capacity: 2, refillPerSec: 0.05 })

/** Derive a short, readable source name from a page URL (its path, else host). */
function pageName(u: string): string {
  try {
    const x = new URL(u)
    const path = x.pathname.replace(/\/+$/, '')
    return path || x.hostname
  } catch {
    return u
  }
}

export async function POST(req: Request) {
  const parsed = crawlSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { botId, url } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!crawlLimiter.check(user.id)) {
    return NextResponse.json({ error: 'Please wait a moment before crawling again.' }, { status: 429 })
  }

  // RLS: a missing bot row means the user doesn't own it.
  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pages = await discoverPages(url, DISCOVER_CAP)
  if (pages.length === 0) {
    return NextResponse.json({ error: 'Could not find any pages to crawl at that URL.' }, { status: 422 })
  }

  // Skip pages already ingested for this bot (so re-crawling adds the next batch).
  const { data: existing } = await supabase
    .from('knowledge_sources')
    .select('metadata')
    .eq('bot_id', botId)
    .eq('type', 'url')
  const existingUrls = new Set(
    (existing ?? []).map((r) => String((r.metadata as { url?: string })?.url ?? '')),
  )
  const fresh = pages.filter((p) => !existingUrls.has(p))
  if (fresh.length === 0) {
    return NextResponse.json(
      { error: 'All pages found at that site are already in your knowledge base.' },
      { status: 409 },
    )
  }

  const toIngest = fresh.slice(0, INGEST_CAP)

  // Create a source per page (RLS scopes it to the user's org).
  const created: KnowledgeSource[] = []
  for (const pageUrl of toIngest) {
    const { data: src } = await supabase
      .from('knowledge_sources')
      .insert({ bot_id: botId, type: 'url', name: pageName(pageUrl), status: 'pending', metadata: { url: pageUrl } })
      .select('*')
      .single<KnowledgeSource>()
    if (src) created.push(src)
  }

  // Ingest each (service role writes embeddings; ingestSource records per-row
  // failures instead of throwing, so one bad page won't abort the batch).
  const svc = createServiceClient()
  for (const src of created) {
    await ingestSource(src.id, { repo: makeServiceRepo(svc) })
  }

  const { data: finalRows } = await supabase
    .from('knowledge_sources')
    .select('*')
    .in(
      'id',
      created.map((s) => s.id),
    )
    .order('created_at', { ascending: false })
    .returns<KnowledgeSource[]>()

  return NextResponse.json({
    sources: finalRows ?? created,
    added: created.length,
    remaining: fresh.length - toIngest.length,
  })
}
