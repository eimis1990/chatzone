import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'

/** Free keeps basic activity totals and transcript access, without paid reports. */
export async function BasicAnalytics({ botId }: { botId: string }) {
  const db = await createServerClient()
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [conversations, messages] = await Promise.all([
    db.from('conversations').select('id', { count: 'exact', head: true })
      .eq('bot_id', botId).gte('started_at', since),
    db.from('messages').select('id, conversations!inner(bot_id)', { count: 'exact', head: true })
      .eq('conversations.bot_id', botId).gte('created_at', since),
  ])
  if (conversations.error || messages.error) throw new Error('Could not load activity totals')
  return <div className="space-y-5">
    <div><h2 className="text-lg font-semibold">Activity</h2><p className="text-sm text-muted-foreground">Last 30 days. Your conversation history remains available.</p></div>
    <dl className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border p-5"><dt>Chat threads started</dt><dd className="mt-2 text-2xl font-semibold">{conversations.count ?? 0}</dd></div>
      <div className="rounded-xl border p-5"><dt>Messages</dt><dd className="mt-2 text-2xl font-semibold">{messages.count ?? 0}</dd></div>
    </dl>
    <p className="rounded-xl border p-5 text-sm">Full analytics, CSAT, product performance, and report exports are included in Basic and above. <Link className="underline" href="/app/subscription">Compare plans</Link></p>
  </div>
}
