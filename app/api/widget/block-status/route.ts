import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { getActiveVisitorBlock } from '@/lib/visitor-blocks'
import type { Bot } from '@/lib/types'

const bodySchema = z.object({
  publicKey: z.string().min(1),
  visitorId: z.string().min(1).max(128),
})

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get('origin')) })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', parsed.data.publicKey)
    .single<Bot>()
  if (!bot || bot.status !== 'active') return json({ error: 'Bot not available' }, 404)
  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  const block = await getActiveVisitorBlock(svc, bot.id, parsed.data.visitorId)
  return json(block ? { blocked: true, blockedUntil: block.expiresAt } : { blocked: false })
}
