import Link from 'next/link'
import { PlusIcon, MessagesSquareIcon, BotIcon, SparklesIcon, type LucideIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
    <div className="max-w-6xl space-y-6 p-6">
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
          <Link key={org.org_id} href={`/owner/clients/${org.org_id}`} className="group block focus:outline-none">
            <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">
                    {org.org_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-1">{org.org_name}</CardTitle>
                      <Badge
                        variant={org.status === 'active' ? 'default' : 'secondary'}
                        className="shrink-0 capitalize"
                      >
                        {org.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-0.5 text-xs">
                      {org.last_activity_at ? `Active ${formatDistanceToNow(org.last_activity_at)}` : 'No activity yet'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile icon={BotIcon} label="Bots" value={org.bots} />
                  <StatTile icon={MessagesSquareIcon} label="Chats" value={org.conversations} />
                  <StatTile icon={SparklesIcon} label="Leads" value={org.leads} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** A single stat cell on a client card — big number over an icon + label. */
function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-2.5 text-center">
      <div className="text-xl font-semibold tabular-nums text-foreground">{value.toLocaleString()}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </div>
    </div>
  )
}
