import { z } from 'zod'
import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import type { Bot } from '@/lib/types'

const leadRequestSchema = z.object({
  publicKey: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  fields: z.record(z.string(), z.string()),
})

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  })
}

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const body = await req.json().catch(() => null)
  const parsed = leadRequestSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid request' }, 400)

  const { publicKey, conversationId, fields } = parsed.data

  const svc = createServiceClient()

  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', publicKey)
    .single<Bot>()

  if (!bot || bot.status !== 'active') {
    return json({ error: 'Bot not found' }, 404)
  }

  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  const { data: lead, error } = await svc
    .from('leads')
    .insert({
      bot_id: bot.id,
      conversation_id: conversationId ?? null,
      fields,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[lead] insert error', error)
    return json({ error: 'Failed to save lead' }, 500)
  }

  return json({ id: lead.id }, 201)
}
