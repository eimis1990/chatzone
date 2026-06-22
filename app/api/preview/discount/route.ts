/**
 * POST /api/preview/discount — authenticated playground equivalent of
 * /api/widget/discount (uses the SAVED bot config).
 */
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDiscount, summarizeDiscount } from '@/lib/commerce'
import type { Bot } from '@/lib/types'

export const maxDuration = 20

const bodySchema = z.object({ botId: z.string().uuid() })

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ available: false, summary: 'Invalid request.' }, { status: 400 })

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ available: false, summary: 'Unauthorized.' }, { status: 401 })

  const { data: owned } = await supabase.from('bots').select('id').eq('id', parsed.data.botId).single()
  if (!owned) return NextResponse.json({ available: false, summary: 'Not found.' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('config')
    .eq('id', parsed.data.botId)
    .single<Pick<Bot, 'config'>>()
  if (!bot) return NextResponse.json({ available: false, summary: 'Not found.' }, { status: 404 })

  const d = getDiscount(bot.config.commerce)
  return NextResponse.json({ available: d.enabled, code: d.code, description: d.description, summary: summarizeDiscount(d) })
}
