import { UsersIcon, BotIcon, MessagesSquareIcon, MessageCircleIcon, PresentationIcon, MailIcon } from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatTileGrid } from '@/components/client/charts/StatCard'
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
  product_suggestions: number
  product_clicks: number
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
    { data: allBots },
    { data: billingOrgs },
    { data: internalOrgs },
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
      .select('org_id, status, last_seen_at, config')
      .order('created_at', { ascending: true }),
    supabase
      .from('organizations')
      .select('is_platform, plan, subscription_status, billing_interval, voice_addon, visualizer_addon, stripe_livemode'),
    supabase.from('organizations').select('id, is_demo').or('is_platform.eq.true,is_demo.eq.true'),
  ])

  const revenue = computeMrr((billingOrgs ?? []) as BillingOrg[])

  const stats: OwnerStats = statsRow ?? {
    total_orgs: 0,
    active_bots: 0,
    total_conversations: 0,
    total_messages: 0,
    total_leads: 0,
  }
  // Loqara's own platform org and demo orgs aren't clients — keep them out.
  const internalIds = new Set((internalOrgs ?? []).map((o: { id: string }) => o.id))
  const demoOrgIds = new Set(
    (internalOrgs ?? []).filter((o: { is_demo: boolean }) => o.is_demo).map((o: { id: string }) => o.id),
  )
  const orgs = ((recentOrgs ?? []) as OrgStatRow[]).filter((o) => !internalIds.has(o.org_id))

  // One pass over the bots: live/embedded counts, demo count, plus each
  // client's brand accent and bot logos for the activity cards.
  type BotRow = {
    org_id: string
    status: string
    last_seen_at: string | null
    config: {
      avatarUrl?: string
      botAvatarUrl?: string
      theme?: { launcherColor?: string; primaryColor?: string }
    } | null
  }
  const bots = (allBots ?? []) as BotRow[]
  const clientBots = bots.filter((b) => !internalIds.has(b.org_id))
  // "Live" = the embed has actually phoned home from a client site.
  const embeddedBots = clientBots.filter((b) => b.status === 'active' && b.last_seen_at).length
  const liveThisWeek = clientBots.filter(
    (b) => b.last_seen_at && b.last_seen_at >= sevenDaysAgo,
  ).length
  const demoBots = bots.filter((b) => demoOrgIds.has(b.org_id)).length

  const accents = new Map<string, string>()
  const logos = new Map<string, string[]>()
  for (const b of clientBots) {
    const color = b.config?.theme?.launcherColor || b.config?.theme?.primaryColor
    if (color && !accents.has(b.org_id)) accents.set(b.org_id, color)
    const logo = b.config?.avatarUrl || b.config?.botAvatarUrl
    if (logo) logos.set(b.org_id, [...(logos.get(b.org_id) ?? []), logo])
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Platform-wide overview across all clients.</p>
      </div>

      {/* Earnings + platform stats — one panel: dark MRR header, hairline tiles below */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <MrrCard {...revenue} />
        <StatTileGrid
          layout="six"
          tone="dark"
          className="rounded-none border-0"
          stats={[
            { label: 'Clients', value: stats.total_orgs, icon: UsersIcon },
            {
              label: 'Live bots',
              value: embeddedBots,
              sub: `${liveThisWeek} active this week`,
              icon: BotIcon,
            },
            { label: 'Conversations', value: stats.total_conversations, icon: MessagesSquareIcon },
            { label: 'Messages', value: stats.total_messages, icon: MessageCircleIcon },
            { label: 'Demo bots', value: demoBots, icon: PresentationIcon },
            { label: 'Signups', value: signupsCount ?? 0, icon: MailIcon },
          ]}
        />
      </div>

      {/* Recent activity — client cells in the same hairline-grid treatment */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Recent activity</h2>
        {orgs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No client organisations yet.</p>
        ) : (
          <div className="overflow-hidden rounded-3xl border bg-card">
            <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
              {orgs.map((org) => (
                <ClientCard key={org.org_id} org={org} accent={accents.get(org.org_id)} logos={logos.get(org.org_id)} tile />
              ))}
              {/* Invisible fillers square off the last row per breakpoint. */}
              {(() => {
                const fill2 = (2 - (orgs.length % 2)) % 2
                const fill3 = (3 - (orgs.length % 3)) % 3
                return Array.from({ length: Math.max(fill2, fill3) }, (_, i) => (
                  <div
                    key={i}
                    aria-hidden="true"
                    className={`hidden bg-card ${i < fill2 ? 'sm:block' : 'sm:hidden'} ${i < fill3 ? 'xl:block' : 'xl:hidden'}`}
                  />
                ))
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
