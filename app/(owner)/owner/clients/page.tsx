import { PlusIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { CreateClientDialog } from '@/components/owner/CreateClientDialog'
import { ClientCard, type ClientCardOrg } from '@/components/owner/ClientCard'

export default async function ClientsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const [{ data: orgs }, { data: platformOrg }] = await Promise.all([
    supabase
      .from('org_stats')
      .select('*')
      .order('last_activity_at', { ascending: false, nullsFirst: false }),
    supabase.from('organizations').select('id').eq('is_platform', true).maybeSingle<{ id: string }>(),
  ])

  // Loqara's own (platform) org isn't a client — keep it out of the list.
  const rows = ((orgs ?? []) as ClientCardOrg[]).filter((o) => o.org_id !== platformOrg?.id)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Clients</h1>
        <p className="text-sm text-muted-foreground">All client organisations on the platform.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {/* Add-client card */}
        <CreateClientDialog
          trigger={
            <button
              type="button"
              className="group flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-11 items-center justify-center rounded-lg border border-dashed border-current">
                <PlusIcon className="size-5" />
              </span>
              <span className="text-sm font-medium">Add client</span>
            </button>
          }
        />

        {rows.map((org) => (
          <ClientCard key={org.org_id} org={org} />
        ))}
      </div>
    </div>
  )
}
