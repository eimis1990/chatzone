import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { commerceEnabled } from '@/lib/ai/commerce-tool'
import { getProductDetails, productDetailsSupported } from '@/lib/commerce'
import { searchCatalog } from '@/lib/products/search'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

// Full product details for the live-voice `get_product_details` client tool.
// Voice agents never see product ids (the search summary is names-only), so the
// tool takes the product NAME and we resolve it via catalog search server-side.
const limiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 })
const bodySchema = z.object({
  publicKey: z.string().min(1),
  productName: z.string().min(1).max(200),
})

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ summary: 'Invalid request.' }, 400)
  const { publicKey, productName } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ summary: 'Bot not available.' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ summary: 'Origin not allowed.' }, 403)
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (!limiter.check(`${bot.id}:${ip}`)) return json({ summary: 'Too many requests.' }, 429)

  if (!commerceEnabled(bot.config) || !productDetailsSupported(bot.config.commerce)) {
    return json({ summary: 'Product details are not available for this store.' })
  }

  try {
    // Resolve the spoken name to a product, then fetch its full live details.
    const matches = await searchCatalog(bot, productName, svc, 3)
    const best = matches[0]
    if (!best) return json({ summary: `No product matching "${productName}" was found.` })

    const [details] = await getProductDetails(bot.config.commerce!, [best.id])
    // Word-boundary cap: the agent summarises anyway, mid-word cuts just read badly.
    const desc = details?.description
    const capped =
      desc && desc.length > 800 ? desc.slice(0, desc.lastIndexOf(' ', 800)) + '…' : desc
    const parts = [
      `${best.title} — ${best.price}${best.inStock ? '' : ' (out of stock)'}.`,
      capped,
      details?.attributes?.length ? `Specifications: ${details.attributes.join('; ')}.` : undefined,
    ].filter(Boolean)
    return json({
      summary:
        parts.join(' ') +
        ' Answer the user briefly from this — do not read it all aloud.' +
        // Semantic resolution returns the nearest match even for a bad name —
        // let the LLM (which knows what was actually asked) reject mismatches.
        ' If this is clearly NOT the product the user meant, say you could not find its details instead.',
    })
  } catch (err) {
    console.error('[agent] voice product details failed:', err)
    return json({ summary: 'Could not fetch the product details right now.' })
  }
}
