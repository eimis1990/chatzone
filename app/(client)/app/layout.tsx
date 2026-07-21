import type { Metadata } from 'next'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { AppSidebar, type BotLite } from '@/components/client/AppSidebar'
import { MobileTabBar } from '@/components/client/MobileTabBar'
import { MobileTopBar } from '@/components/client/MobileTopBar'
import { Toaster } from '@/components/ui/sonner'

// Dashboard is private — auth protects it; this keeps crawlers from indexing it.
export const metadata: Metadata = { robots: { index: false, follow: false } }

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

  // Total across bots — drives the mobile Inbox tab badge.
  const inboxTotal = bots.reduce((sum, b) => sum + (b.inboxCount ?? 0), 0)

  // The whole shell carries the green mesh; the content is a white rounded card
  // floating on top, with the mesh showing through the gutter around it.
  // Below md: the sidebar becomes a bottom tab bar + top bar (mobile portal).
  return (
    <>
      <div className="relative isolate flex h-svh flex-col overflow-hidden bg-sidebar-mesh md:flex-row">
        {/* Decorative grid fading up from the bottom of the dark shell */}
        <div className="shell-grid pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[42vh]" aria-hidden="true" />
        <div className="hidden md:flex">
          <AppSidebar bots={bots} userEmail={user.email ?? ''} />
        </div>
        <MobileTopBar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background pb-20 md:m-3 md:rounded-2xl md:pb-0 md:shadow-sm">
          {children}
        </main>
        <MobileTabBar inboxCount={inboxTotal} />
      </div>
      {/* OUTSIDE the isolate stacking context: the widget preview portals to
          document.body (z-45), which out-stacks anything inside the layout —
          toasts must live at the same body level to render above it. */}
      <Toaster />
    </>
  )
}
