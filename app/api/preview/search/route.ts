import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { commerceEnabled } from '@/lib/ai/commerce-tool'
import { searchStore } from '@/lib/commerce'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import type { Bot } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

export const maxDuration = 20

// Authenticated voice-search for the playground's `search_products` client tool.
const bodySchema = z.object({ botId: z.string().uuid(), query: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ products: [], summary: 'Invalid request.' }, { status: 400 })
  const { botId, query } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ products: [], summary: 'Unauthorized.' }, { status: 401 })

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ products: [], summary: 'Not found.' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
  if (!bot) return NextResponse.json({ products: [], summary: 'Not found.' }, { status: 404 })

  let products: CommerceProduct[] = []
  if (commerceEnabled(bot.config)) {
    try {
      products = await searchStore(
        { enabled: true, provider: bot.config.commerce.provider, storeUrl: bot.config.commerce.storeUrl },
        { query, limit: 10 },
      )
    } catch {
      // fall through
    }
  }

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

  return NextResponse.json({ products, summary })
}
