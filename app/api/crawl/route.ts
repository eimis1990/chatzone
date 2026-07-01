import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import { discoverPages } from '@/lib/ingestion/crawl'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { crawlSchema } from '@/lib/validation/schemas'
import { createRateLimiter } from '@/lib/ratelimit'
import type { KnowledgeSource } from '@/lib/types'

// Discovery + ingesting several pages takes a while; ingestion runs inline so it
// completes regardless of the client.
export const maxDuration = 300

// Discover broadly, but only ingest a batch per crawl (bounds the request time;
// re-crawling picks up the next batch of fresh pages).
const DISCOVER_CAP = 60
const INGEST_CAP = 15

// Crawling is expensive — a couple per minute per user.
const crawlLimiter = createRateLimiter({ capacity: 2, refillPerSec: 0.05 })

// Pages most support questions hit — contact, returns/refunds, terms, privacy,
// shipping/delivery, payment, warranty, about, FAQ (Lithuanian + English). These
// are ingested first so a single crawl front-loads the highest-value info.
const PRIORITY_RE =
  /(kontakt|contact|susisiek|gr[aą]žin|grazin|return|refund|atsisak|taisykl|s[aą]lyg|salyg|terms|conditions|privatum|privacy|gdpr|slapuk|cookie|pristatym|siunt|delivery|shipping|apmok|mok[eė]jim|payment|garantij|warranty|apie|about|duk|faq|klausim)/i
const BLOG_RE = /\/(patarimai|blog|straipsn|news|tinklarast|article)\//i

/** Rank a page for ingestion priority: policy/contact pages first, blogs last. */
function priorityScore(u: string): number {
  try {
    const path = new URL(u).pathname.toLowerCase()
    if (path === '/' || path === '') return 3 // homepage: general store info
    let score = 0
    if (PRIORITY_RE.test(path)) score += 5
    if (BLOG_RE.test(path)) score -= 1 // let policy pages win ties over articles
    return score
  } catch {
    return 0
  }
}

// Product & category pages are served by the live store feed (always-current
// prices + stock), so we do NOT ingest them into the knowledge base — that would
// duplicate the catalog and, worse, freeze prices at crawl time. We crawl only
// content pages (policies, FAQ, about, blog). Covers WooCommerce (LT + EN).
const PRODUCT_URL_RE =
  /\/(produktas|produkto-kategorija|product|product-category|shop|store|parduotuv|prek[eė])\//i
function isProductUrl(u: string): boolean {
  try {
    return PRODUCT_URL_RE.test(new URL(u).pathname.toLowerCase())
  } catch {
    return false
  }
}

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

  // SSRF guard: block internal/non-public crawl targets before any fetch.
  try {
    await assertPublicUrl(url)
  } catch {
    return NextResponse.json({ error: 'That URL is not allowed.' }, { status: 400 })
  }

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
  // Ingest highest-value pages first (policy/contact/etc.), blogs last. Stable
  // sort keeps sitemap order within the same priority tier.
  const fresh = pages
    .filter((p) => !existingUrls.has(p) && !isProductUrl(p))
    .sort((a, b) => priorityScore(b) - priorityScore(a))
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
