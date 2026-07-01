import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { syncProductCatalog } from '@/lib/products/sync'
import { createRateLimiter } from '@/lib/ratelimit'
import type { Bot } from '@/lib/types'

// Fetching + AI-tagging + embedding a catalog takes a while.
export const maxDuration = 300

const bodySchema = z.object({ botId: z.string().uuid() })
// Syncing is expensive — a couple per few minutes per user.
const limiter = createRateLimiter({ capacity: 2, refillPerSec: 0.02 })

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { botId } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!limiter.check(user.id)) {
    return NextResponse.json({ error: 'Please wait a moment before syncing again.' }, { status: 429 })
  }

  // RLS: a missing bot row means the user can't manage it.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const svc = createServiceClient()
  const { data: bot } = await svc.from('bots').select('*').eq('id', botId).single<Bot>()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { synced } = await syncProductCatalog(bot, svc)
    return NextResponse.json({ synced })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Sync failed' },
      { status: 502 },
    )
  }
}
