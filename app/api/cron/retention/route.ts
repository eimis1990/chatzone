import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

/**
 * Daily retention purge (Vercel Cron). For each org with `retention_days` set,
 * deletes conversations (and their messages, via cascade) whose last activity is
 * older than the window. Secured by CRON_SECRET (Vercel sends it as a Bearer).
 */
export async function GET(req: Request) {
  // Fail CLOSED: without a configured secret (or on mismatch) this destructive,
  // service-role, cross-tenant purge must never run for an anonymous caller.
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const svc = createServiceClient()

  const { data: orgs } = await svc
    .from('organizations')
    .select('id, retention_days')
    .not('retention_days', 'is', null)
  if (!orgs?.length) return Response.json({ ok: true, orgs: 0, deleted: 0 })

  let deleted = 0
  for (const org of orgs as { id: string; retention_days: number }[]) {
    const { data: bots } = await svc.from('bots').select('id').eq('org_id', org.id)
    const botIds = (bots ?? []).map((b) => (b as { id: string }).id)
    if (!botIds.length) continue

    const cutoff = new Date(Date.now() - org.retention_days * 86_400_000).toISOString()
    const { data: del } = await svc
      .from('conversations')
      .delete()
      .in('bot_id', botIds)
      .lt('last_message_at', cutoff)
      .select('id')
    deleted += del?.length ?? 0
  }

  return Response.json({ ok: true, orgs: orgs.length, deleted })
}
