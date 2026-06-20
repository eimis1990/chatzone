import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { CreateClientDialog } from '@/components/owner/CreateClientDialog'
import { formatDistanceToNow } from '@/lib/date-utils'

interface OrgStatRow {
  org_id: string
  org_name: string
  status: string
  bots: number
  conversations: number
  messages: number
  leads: number
  last_activity_at: string | null
}

export default async function ClientsPage() {
  await requireRole('owner')

  const supabase = await createServerClient()
  const { data: orgs } = await supabase
    .from('org_stats')
    .select('*')
    .order('last_activity_at', { ascending: false, nullsFirst: false })

  const rows = (orgs ?? []) as OrgStatRow[]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All client organisations on the platform.
          </p>
        </div>
        <CreateClientDialog />
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center gap-3">
          <p className="font-medium text-foreground">No clients yet</p>
          <p className="text-sm text-muted-foreground">
            Add your first client to get started.
          </p>
          <CreateClientDialog />
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Bots</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Conversations</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Leads</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((org) => (
                <tr
                  key={org.org_id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/owner/clients/${org.org_id}`}
                      className="font-medium hover:underline"
                    >
                      {org.org_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={org.status === 'active' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {org.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{org.bots}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{org.conversations}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{org.leads}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {org.last_activity_at
                      ? formatDistanceToNow(org.last_activity_at)
                      : 'No activity'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
