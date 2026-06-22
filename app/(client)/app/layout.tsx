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
  }

  // The whole shell carries the green mesh; the content is a white rounded card
  // floating on top, with the mesh showing through the gutter around it.
  return (
    <div className="flex h-svh overflow-hidden bg-sidebar-mesh">
      <AppSidebar bots={bots} userEmail={user.email ?? ''} />
      <main className="flex-1 min-w-0 m-3 overflow-y-auto rounded-2xl bg-background ring-1 ring-primary/40">
        {children}
      </main>
    </div>
  )
}
