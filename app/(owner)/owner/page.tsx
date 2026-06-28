import { UsersIcon, BotIcon, MessagesSquareIcon, MessageCircleIcon, SparklesIcon, MailIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/client/charts/StatCard'
import { ClientCard } from '@/components/owner/ClientCard'

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
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [{ data: statsRow }, { data: recentOrgs }, { count: signupsCount }, { count: liveBots }] =
    await Promise.all([
      supabase.from('owner_stats').select('*').single<OwnerStats>(),
      supabase
        .from('org_stats')
        .select('*')
        .order('last_activity_at', { ascending: false, nullsFirst: false })
        .limit(8),
      supabase.from('signups').select('id', { count: 'exact', head: true }),
      supabase
        .from('bots')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('last_seen_at', sevenDaysAgo),
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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across all clients.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Clients" value={stats.total_orgs} icon={UsersIcon} accent="slate" />
        <StatCard
          label="Active bots"
          value={stats.active_bots}
          sub={`${liveBots ?? 0} live this week`}
          icon={BotIcon}
          accent="green"
          highlight
        />
        <StatCard label="Conversations" value={stats.total_conversations} icon={MessagesSquareIcon} accent="blue" />
        <StatCard label="Messages" value={stats.total_messages} icon={MessageCircleIcon} accent="violet" />
        <StatCard label="Leads" value={stats.total_leads} icon={SparklesIcon} accent="amber" />
        <StatCard label="Signups" value={signupsCount ?? 0} icon={MailIcon} accent="rose" />
      </div>

      {/* Recent activity */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client organisations yet.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {orgs.map((org) => (
              <ClientCard key={org.org_id} org={org} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
