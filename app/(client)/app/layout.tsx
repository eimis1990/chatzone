import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { AppSidebar, type BotLite } from '@/components/client/AppSidebar'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireRole('client')

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null
  let bots: BotLite[] = []
  if (orgId) {
    const supabase = await createServerClient()
    const { data } = await supabase
      .from('bots')
      .select('id, name, status')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    bots = (data ?? []) as BotLite[]

    // Per-bot count of conversations awaiting / in human handoff (sidebar badge).
    const botIds = bots.map((b) => b.id)
    if (botIds.length > 0) {
      const { data: pending } = await supabase
        .from('conversations')
        .select('bot_id')
        .in('bot_id', botIds)
        .in('handoff_status', ['requested', 'live'])
      const counts: Record<string, number> = {}
      for (const row of pending ?? []) {
        const bid = (row as { bot_id: string }).bot_id
        counts[bid] = (counts[bid] ?? 0) + 1
      }
      bots = bots.map((b) => ({ ...b, inboxCount: counts[b.id] ?? 0 }))
    }
  }

  // The whole shell carries the green mesh; the content is a white rounded card
  // floating on top, with the mesh showing through the gutter around it.
  return (
    <div className="relative isolate flex h-svh overflow-hidden bg-sidebar-mesh">
      {/* Decorative grid fading up from the bottom of the dark shell */}
      <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[22vh]" aria-hidden="true" />
      <AppSidebar bots={bots} userEmail={user.email ?? ''} />
      <main className="flex-1 min-w-0 m-3 overflow-y-auto rounded-2xl bg-background shadow-sm">
        {children}
      </main>
    </div>
  )
}
