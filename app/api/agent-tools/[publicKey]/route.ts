import { createServiceClient } from '@/lib/supabase/service'
import { getLlmToken } from '@/lib/ai/llm-auth'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import { commerceEnabled } from '@/lib/ai/commerce-tool'
import { searchStore } from '@/lib/commerce'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

/**
 * `search` webhook tool for the live-voice agent (ElevenLabs server tool).
 *
 * ElevenLabs POSTs `{ query }` here when the agent decides to search. We run the
 * bot's live product search (commerce) + semantic RAG over its knowledge base
 * and return a compact text result the agent speaks from.
 *
 * Auth: Bearer <shared token> (same value embedded in the tool's request headers).
 */
export async function POST(req: Request, ctx: { params: Promise<{ publicKey: string }> }) {
  const { publicKey } = await ctx.params
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

  const svc = createServiceClient()

  // Verify the shared bearer token.
  const presented = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const expected = await getLlmToken(svc)
  if (!expected || presented !== expected) return json({ error: 'Unauthorized' }, 401)

  const body = (await req.json().catch(() => null)) as { query?: string } | null
  const query = body?.query?.trim()
  if (!query) return json({ result: 'No query provided.' })

  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)

  const parts: string[] = []

  // 1) Live product search (commerce bots).
  if (commerceEnabled(bot.config)) {
    try {
      const products = await searchStore(
        {
          enabled: true,
          provider: bot.config.commerce.provider,
          storeUrl: bot.config.commerce.storeUrl,
        },
        { query, limit: 5 },
      )
      if (products.length) {
        const list = products
          .slice(0, 4)
          .map((p, i) => `${i + 1}. ${p.title} — ${p.price}${p.inStock ? '' : ' (out of stock)'}`)
          .join('\n')
        parts.push(`Matching products:\n${list}`)
      }
    } catch {
      // Store search failed — fall back to knowledge only.
    }
  }

  // 2) Semantic RAG over the knowledge base.
  try {
    const retrieval = await retrieveContext(bot.id, query, {}, serviceRetrievalDeps(svc))
    if (retrieval.chunks.length) {
      const info = retrieval.chunks
        .map((c) => c.content)
        .join(' ')
        .slice(0, 700)
      parts.push(`Knowledge base:\n${info}`)
    }
  } catch {
    // Retrieval failed — return whatever we have.
  }

  const result = parts.length
    ? parts.join('\n\n')
    : 'No matching products or information were found for that query.'
  return json({ result })
}
