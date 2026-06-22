/**
 * POST /api/preview/order — authenticated playground equivalent of
 * /api/widget/order. Uses the SAVED bot config (so REST creds must be saved to
 * test order lookup in the preview).
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrderStatus, summarizeOrder } from '@/lib/commerce'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

const bodySchema = z.object({
  botId: z.string().uuid(),
  orderId: z.string().min(1).max(64),
  email: z.string().min(3).max(200),
})

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ found: false, summary: 'Invalid request.' }, { status: 400 })
  const { botId, orderId, email } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ found: false, summary: 'Unauthorized.' }, { status: 401 })

  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ found: false, summary: 'Not found.' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('config').eq('id', botId).single<Pick<Bot, 'config'>>()
  if (!bot) return NextResponse.json({ found: false, summary: 'Not found.' }, { status: 404 })

  const order = await getOrderStatus(bot.config.commerce, { orderId, email })
  return NextResponse.json({
    found: order.found,
    order: order.found ? order : undefined,
    summary: summarizeOrder(order),
  })
}
