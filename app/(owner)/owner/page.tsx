import Link from 'next/link'
import { UsersIcon, BotIcon, MessagesSquareIcon, MessageCircleIcon, SparklesIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/client/charts/StatCard'
import { Badge } from '@/components/ui/badge'
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
    supabase.from('owner_stats').select('*').single<OwnerStats>(),
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
    <div className="max-w-6xl space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across all clients.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Clients" value={stats.total_orgs} icon={UsersIcon} accent="slate" />
        <StatCard label="Active bots" value={stats.active_bots} icon={BotIcon} accent="green" highlight />
        <StatCard label="Conversations" value={stats.total_conversations} icon={MessagesSquareIcon} accent="blue" />
        <StatCard label="Messages" value={stats.total_messages} icon={MessageCircleIcon} accent="violet" />
        <StatCard label="Leads" value={stats.total_leads} icon={SparklesIcon} accent="amber" />
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client organisations yet.</p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {orgs.map((org) => (
              <Link
                key={org.org_id}
                href={`/owner/clients/${org.org_id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="truncate font-medium">{org.org_name}</span>
                  <Badge variant={org.status === 'active' ? 'default' : 'secondary'} className="shrink-0 capitalize">
                    {org.status}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-6 text-xs text-muted-foreground">
                  <span>{org.bots} bot{org.bots !== 1 ? 's' : ''}</span>
                  <span>{org.conversations} conv.</span>
                  <span>{org.leads} leads</span>
                  <span className="hidden sm:block">
                    {org.last_activity_at ? formatDistanceToNow(org.last_activity_at) : 'No activity'}
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
