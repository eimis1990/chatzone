import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { generateKbLint } from '@/lib/ingestion/lint'
import { createRateLimiter } from '@/lib/ratelimit'

// Retrieval + an LLM analysis per topic; give it room.
export const maxDuration = 120

const bodySchema = z.object({ botId: z.string().uuid() })
// A handful of LLM calls — a couple per few minutes per user.
const limiter = createRateLimiter({ capacity: 2, refillPerSec: 0.03 })

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
    return NextResponse.json({ error: 'Please wait a moment before scanning again.' }, { status: 429 })
  }

  // RLS: a missing bot row means the user can't manage it.
  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const result = await generateKbLint(botId, createServiceClient())
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Scan failed' },
      { status: 502 },
    )
  }
}
