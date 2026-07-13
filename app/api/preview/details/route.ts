import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { commerceEnabled } from '@/lib/ai/commerce-tool'
import { getProductDetails, productDetailsSupported } from '@/lib/commerce'
import { searchCatalog } from '@/lib/products/search'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

// Authenticated full-details lookup for the playground's `get_product_details`
// voice client tool — the preview mirror of /api/widget/details (name-based:
// the voice LLM never sees product ids).
const bodySchema = z.object({
  botId: z.string().uuid(),
  productName: z.string().min(1).max(200),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ summary: 'Invalid request.' }, { status: 400 })
  const { botId, productName } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ summary: 'Unauthorized.' }, { status: 401 })

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ summary: 'Not found.' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
  if (!bot) return NextResponse.json({ summary: 'Not found.' }, { status: 404 })

  if (!commerceEnabled(bot.config) || !productDetailsSupported(bot.config.commerce)) {
    return NextResponse.json({ summary: 'Product details are not available for this store.' })
  }

  try {
    const matches = await searchCatalog(bot, productName, svc, 3)
    const best = matches[0]
    if (!best) return NextResponse.json({ summary: `No product matching "${productName}" was found.` })

    const [details] = await getProductDetails(bot.config.commerce!, [best.id])
    const desc = details?.description
    const capped =
      desc && desc.length > 800 ? desc.slice(0, desc.lastIndexOf(' ', 800)) + '…' : desc
    const parts = [
      `${best.title} — ${best.price}${best.inStock ? '' : ' (out of stock)'}.`,
      capped,
      details?.attributes?.length ? `Specifications: ${details.attributes.join('; ')}.` : undefined,
    ].filter(Boolean)
    return NextResponse.json({
      summary:
        parts.join(' ') +
        ' Answer the user briefly from this — do not read it all aloud.' +
        ' If this is clearly NOT the product the user meant, say you could not find its details instead.',
    })
  } catch (err) {
    console.error('[agent] preview product details failed:', err)
    return NextResponse.json({ summary: 'Could not fetch the product details right now.' })
  }
}
