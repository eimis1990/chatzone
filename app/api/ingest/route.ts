import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { ingestSource, makeServiceRepo } from '@/lib/ingestion/pipeline'
import { createRateLimiter } from '@/lib/ratelimit'

// Ingestion (parse + embed) can take a while for large files.
export const maxDuration = 300

const bodySchema = z.object({ sourceId: z.string().uuid() })

// ~20 ingestion triggers/min per user, modest burst.
const ingestLimiter = createRateLimiter({ capacity: 8, refillPerSec: 0.33 })

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Authenticate the requesting user.
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ingestLimiter.check(user.id)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // RLS ensures the user can only see sources for bots in their own org;
  // a missing row means they don't own it.
  const { data: source } = await supabase
    .from('knowledge_sources')
    .select('id')
    .eq('id', parsed.data.sourceId)
    .single()
  if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Run ingestion with the service role (needed to write embeddings).
  const svc = createServiceClient()
  await ingestSource(parsed.data.sourceId, { repo: makeServiceRepo(svc) })

  const { data: updated } = await supabase
    .from('knowledge_sources')
    .select('status, error_message')
    .eq('id', parsed.data.sourceId)
    .single()

  return NextResponse.json({
    status: updated?.status ?? 'unknown',
    error: updated?.error_message ?? null,
  })
}
