import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/client/charts/StatCard'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDistanceToNow } from '@/lib/date-utils'

interface OwnerStats {
  total_orgs: number
  active_bots: number
  total_conversations: number
  total_messages: number
  total_leads: number
}

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

export default async function OwnerDashboardPage() {
  await requireRole('owner')

  const supabase = await createServerClient()

  const [{ data: statsRow }, { data: recentOrgs }] = await Promise.all([
    supabase
      .from('owner_stats')
      .select('*')
      .single<OwnerStats>(),
    supabase
      .from('org_stats')
      .select('*')
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .limit(8),
  ])

  const stats: OwnerStats = statsRow ?? {
    total_orgs: 0,
    active_bots: 0,
    total_conversations: 0,
    total_messages: 0,
    total_leads: 0,
  }

  const orgs = (recentOrgs ?? []) as OrgStatRow[]

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Owner Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide overview across all clients.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Clients" value={stats.total_orgs} />
        <StatCard label="Active Bots" value={stats.active_bots} />
        <StatCard label="Conversations" value={stats.total_conversations} />
        <StatCard label="Messages" value={stats.total_messages} />
        <StatCard label="Leads" value={stats.total_leads} />
      </div>

      {/* Recent activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client organisations yet.</p>
        ) : (
          <div className="border rounded-lg divide-y">
            {orgs.map((org) => (
              <Link
                key={org.org_id}
                href={`/owner/clients/${org.org_id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-medium truncate">{org.org_name}</span>
                  <Badge
                    variant={org.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize shrink-0"
                  >
                    {org.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground shrink-0 ml-4">
                  <span>{org.bots} bot{org.bots !== 1 ? 's' : ''}</span>
                  <span>{org.conversations} conv.</span>
                  <span>{org.leads} leads</span>
                  <span className="hidden sm:block">
                    {org.last_activity_at
                      ? formatDistanceToNow(org.last_activity_at)
                      : 'No activity'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
