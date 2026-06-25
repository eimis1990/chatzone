import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { createRateLimiter } from '@/lib/ratelimit'
import { fetchProductsFromUrl } from '@/lib/commerce/feed'
import { sqUrl, sqLabel } from '@/lib/widget-config'
import type { Bot, BotLanguage, HandoffStatus } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

export const maxDuration = 20

// Runs a "fetch URL" quick action: resolves the owner-configured URL for the
// given action index (never trusts a URL from the browser), fetches it
// server-side, maps it to product cards, and persists the turn.
const limiter = createRateLimiter({ capacity: 20, refillPerSec: 1 })
const bodySchema = z.object({
  publicKey: z.string().min(1),
  actionIndex: z.number().int().min(0).max(20),
  language: z.enum(['en', 'lt']).optional(),
  conversationId: z.string().uuid().optional(),
  visitorId: z.string().min(1),
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
  if (!parsed.success) return json({ products: [] }, 400)
  const { publicKey, actionIndex, language, conversationId, visitorId } = parsed.data

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('public_key', publicKey).single<Bot>()
  if (!bot || bot.status !== 'active') return json({ products: [] }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) return json({ products: [] }, 403)
  if (!limiter.check(bot.id)) return json({ products: [] }, 429)

  // Resolve the configured action + its URL (server-side; never from the body).
  const languages = bot.config.languages ?? ['en']
  const lang: BotLanguage =
    language && languages.includes(language)
      ? language
      : (bot.config.defaultLanguage && languages.includes(bot.config.defaultLanguage)
          ? bot.config.defaultLanguage
          : languages[0]) ?? 'en'
  const action = bot.config.content?.[lang]?.suggestedQuestions?.[actionIndex]
  const url = action ? sqUrl(action) : undefined
  if (!action || !url) return json({ products: [] }, 400)

  let products: CommerceProduct[] = []
  try {
    products = await fetchProductsFromUrl(url)
  } catch {
    return json({ products: [] }, 200)
  }

  // Persist the turn so it appears in the transcript (find/create conversation).
  let convId = conversationId ?? null
  if (convId) {
    const { data: existing } = await svc
      .from('conversations')
      .select('id, handoff_status')
      .eq('id', convId)
      .eq('bot_id', bot.id)
      .single<{ id: string; handoff_status: HandoffStatus | null }>()
    if (!existing) convId = null
  }
  if (!convId) {
    const { data: created } = await svc
      .from('conversations')
      .insert({ bot_id: bot.id, visitor_id: visitorId })
      .select('id')
      .single()
    convId = (created?.id as string) ?? null
  }
  if (convId) {
    await svc.from('messages').insert({ conversation_id: convId, role: 'user', content: sqLabel(action) })
    await svc.from('messages').insert({ conversation_id: convId, role: 'assistant', content: '', products })
    await svc.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convId)
  }

  return json({ products, conversationId: convId ?? undefined })
}
