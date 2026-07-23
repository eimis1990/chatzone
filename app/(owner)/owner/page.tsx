import { UsersIcon, BotIcon, MessagesSquareIcon, MessageCircleIcon, SparklesIcon, MailIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/client/charts/StatCard'
import { ClientCard } from '@/components/owner/ClientCard'
import { MrrCard } from '@/components/owner/MrrCard'
import { computeMrr, type BillingOrg } from '@/lib/billing/mrr'

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
  const [
    { data: statsRow },
    { data: recentOrgs },
    { count: signupsCount },
    { count: liveBots },
    { data: billingOrgs },
  ] = await Promise.all([
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
    supabase
      .from('organizations')
      .select('is_platform, plan, subscription_status, billing_interval, voice_addon, visualizer_addon'),
  ])

  const revenue = computeMrr((billingOrgs ?? []) as BillingOrg[])

  const stats: OwnerStats = statsRow ?? {
    total_orgs: 0,
    active_bots: 0,
    total_conversations: 0,
    total_messages: 0,
    total_leads: 0,
  }
  const { data: internalOrgs } = await supabase
    .from('organizations')
    .select('id')
    .or('is_platform.eq.true,is_demo.eq.true')
  // Loqara's own platform org and demo orgs aren't clients — keep them out.
  const internalIds = new Set((internalOrgs ?? []).map((o: { id: string }) => o.id))
  const orgs = ((recentOrgs ?? []) as OrgStatRow[]).filter((o) => !internalIds.has(o.org_id))

  // Brand accent per client (first bot's theme) for the activity cards.
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
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across all clients.</p>
      </div>

      {/* Earnings headline */}
      <MrrCard {...revenue} />

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
              <ClientCard key={org.org_id} org={org} accent={accents.get(org.org_id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
