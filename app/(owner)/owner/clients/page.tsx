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
    supabase.from('organizations').select('id').or('is_platform.eq.true,is_demo.eq.true'),
  ])

  // Loqara's own platform org and demo orgs aren't clients — keep them out.
  const internalIds = new Set(((platformOrg ?? []) as { id: string }[]).map((o) => o.id))
  const rows = ((orgs ?? []) as ClientCardOrg[]).filter((o) => !internalIds.has(o.org_id))

  // Each card glows in the client's own brand color (their first bot's theme).
  const { data: brandBots } = await supabase
    .from('bots')
    .select('org_id, config')
    .order('created_at', { ascending: true })
  const accents = new Map<string, string>()
  for (const b of brandBots ?? []) {
    const theme = (b.config as { theme?: { launcherColor?: string; primaryColor?: string } })?.theme
    const color = theme?.launcherColor || theme?.primaryColor
    if (color && !accents.has(b.org_id as string)) accents.set(b.org_id as string, color)
  }

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
          <ClientCard key={org.org_id} org={org} accent={accents.get(org.org_id)} />
        ))}
      </div>
    </div>
  )
}
