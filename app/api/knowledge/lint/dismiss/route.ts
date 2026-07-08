import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  botId: z.string().uuid(),
  fingerprint: z.string().min(1).max(64),
})

/**
 * Dismiss a knowledge-check finding so it stops showing. Persisted per bot by
 * the finding's stable fingerprint; a re-scan resurfaces it only if the
 * underlying content changed (which changes the fingerprint). Writes go through
 * the RLS-scoped client, so a user can only dismiss for a bot in their own org.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { botId, fingerprint } = parsed.data

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS: a missing bot row means the user can't manage it.
  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('knowledge_lint_dismissals')
    .upsert({ bot_id: botId, fingerprint, created_by: user.id }, { onConflict: 'bot_id,fingerprint' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
