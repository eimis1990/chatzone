import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { commerceEnabled } from '@/lib/ai/commerce-tool'
import { searchStore } from '@/lib/commerce'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

export const maxDuration = 20

// Public search for the live-voice `search_products` client tool: returns
// products (rendered as cards in the widget) + a short summary the agent speaks.
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })
const bodySchema = z.object({ publicKey: z.string().min(1), query: z.string().min(1) })

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ products: [], summary: 'Invalid request.' }, 400)
  const { publicKey, query } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ products: [], summary: 'Bot not available.' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ products: [], summary: 'Origin not allowed.' }, 403)
  }
  if (!limiter.check(bot.id)) return json({ products: [], summary: 'Too many requests.' }, 429)

  let products: CommerceProduct[] = []
  if (commerceEnabled(bot.config)) {
    try {
      products = await searchStore(
        { enabled: true, provider: bot.config.commerce.provider, storeUrl: bot.config.commerce.storeUrl },
        { query, limit: 10 },
      )
    } catch {
      // store search failed — fall through to knowledge
    }
  }

  // Knowledge-base context, used only to enrich the spoken summary.
  let info = ''
  if (!products.length) {
    try {
      const retrieval = await retrieveContext(bot.id, query, {}, serviceRetrievalDeps(svc))
      if (retrieval.chunks.length) info = retrieval.chunks.map((c) => c.content).join(' ').slice(0, 500)
    } catch {
      // ignore
    }
  }

  let summary: string
  if (products.length) {
    const names = products.slice(0, 4).map((p) => `${p.title} (${p.price})`).join('; ')
    summary = `Showing ${products.length} matching products to the user as cards: ${names}. Tell them you've shown some options.`
  } else if (info) {
    summary = info
  } else {
    summary = 'No matching products were found for that query.'
  }

  return json({ products, summary })
}
