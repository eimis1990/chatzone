import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

// Knowledge lookup for the live-voice `search_knowledge` client tool. Text chat
// retrieves the knowledge base server-side and injects it into the prompt; the
// voice agent can't, so it calls this to answer informational questions from the
// same hybrid retrieval — keeping spoken and typed answers consistent.
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
  if (!parsed.success) return json({ answer: '' }, 400)
  const { publicKey, query } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ answer: '' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) return json({ answer: '' }, 403)
  if (!limiter.check(bot.id)) return json({ answer: '' }, 429)

  let answer = ''
  try {
    const retrieval = await retrieveContext(bot.id, query, {}, serviceRetrievalDeps(svc))
    if (retrieval.chunks.length) {
      answer = retrieval.chunks.map((c) => c.content).join('\n\n').slice(0, 1500)
    }
  } catch {
    // retrieval unavailable — return empty so the tool tells the user it can't find it
  }
  return json({ answer })
}
