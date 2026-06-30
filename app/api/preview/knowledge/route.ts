import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { retrieveContext, serviceRetrievalDeps } from '@/lib/ai/retrieval'

export const maxDuration = 20

// Authenticated knowledge lookup for the playground's `search_knowledge` tool —
// the preview mirror of /api/widget/knowledge, so voice answers from the KB the
// same way in the configurator as on the live widget.
const bodySchema = z.object({ botId: z.string().uuid(), query: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ answer: '' }, { status: 400 })
  const { botId, query } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ answer: '' }, { status: 401 })

  // RLS confirms ownership.
  const { data: owned } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!owned) return NextResponse.json({ answer: '' }, { status: 404 })

  const svc = createServiceClient()
  let answer = ''
  try {
    const retrieval = await retrieveContext(botId, query, {}, serviceRetrievalDeps(svc))
    if (retrieval.chunks.length) {
      // Keep it tight: the voice agent only needs enough context to answer in a
      // sentence or two — a smaller payload means a faster spoken reply.
      answer = retrieval.chunks.slice(0, 3).map((c) => c.content).join('\n\n').slice(0, 900)
    }
  } catch {
    // ignore — empty answer signals "not found" to the tool
  }
  return NextResponse.json({ answer })
}
