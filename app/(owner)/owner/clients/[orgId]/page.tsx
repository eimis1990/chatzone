import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/client/charts/StatCard'
import { LiveIndicator } from '@/components/LiveIndicator'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { formatDistanceToNow, formatTimeUntil } from '@/lib/date-utils'
import { SuspendToggle } from '@/components/owner/SuspendToggle'
import { ResendInviteButton } from '@/components/owner/ResendInviteButton'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { Button } from '@/components/ui/button'
import { createBotForOrg } from './actions'
import type { Bot, Invite } from '@/lib/types'

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

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  await requireRole('owner')
  const { orgId } = await params

  // Inline server action bound to this client's org, passed to the create dialog.
  async function createBot(name: string) {
    'use server'
    return createBotForOrg(orgId, name)
  }

  const supabase = await createServerClient()

  // Owner sees all rows via RLS — parallel fetches
  const [{ data: orgStat }, { data: bots }, { data: invites }] = await Promise.all([
    supabase
      .from('org_stats')
      .select('*')
      .eq('org_id', orgId)
      .single<OrgStatRow>(),
    supabase
      .from('bots')
      .select('id, name, status, config, created_at, public_key, last_seen_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
    supabase
      .from('invites')
      .select('id, email, status, expires_at, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false }),
  ])

  if (!orgStat) notFound()

  const botRows = (bots ?? []) as Pick<
    Bot,
    'id' | 'name' | 'status' | 'config' | 'created_at' | 'public_key' | 'last_seen_at'
  >[]
  const inviteRows = (invites ?? []) as Pick<Invite, 'id' | 'email' | 'status' | 'expires_at' | 'created_at'>[]

  return (
    <div className="space-y-8 p-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground flex items-center gap-1.5">
        <Link href="/owner/clients" className="hover:text-foreground">
          Clients
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{orgStat.org_name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{orgStat.org_name}</h1>
          <Badge
            variant={orgStat.status === 'active' ? 'default' : 'secondary'}
            className="capitalize"
          >
            {orgStat.status}
          </Badge>
        </div>
        <SuspendToggle
          orgId={orgId}
          currentStatus={orgStat.status as 'active' | 'suspended'}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Bots" value={orgStat.bots} />
        <StatCard label="Conversations" value={orgStat.conversations} />
        <StatCard label="Messages" value={orgStat.messages} />
        <StatCard label="Leads" value={orgStat.leads} />
      </div>

      {/* Bots list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Bots</h2>
          <CreateBotDialog
            orgId={orgId}
            action={createBot}
            configureBase={`/owner/clients/${orgId}/bots`}
            trigger={
              <Button variant="outline" size="sm">
                New bot
              </Button>
            }
          />
        </div>
        {botRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No bots in this organisation yet. Use <span className="font-medium">New bot</span> to
            create one for this client, then configure it.
          </p>
        ) : (
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {botRows.map((bot) => (
              <div
                key={bot.id}
                className="flex items-center justify-between px-4 py-3 gap-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium truncate">{bot.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {bot.public_key}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <LiveIndicator lastSeenAt={bot.last_seen_at} />
                  <Badge
                    variant={bot.status === 'active' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {bot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground hidden sm:block">
                    {formatDistanceToNow(bot.created_at)}
                  </span>
                  <Link
                    href={`/owner/clients/${orgId}/bots/${bot.id}/configure`}
                    className={buttonVariants({ variant: 'outline', size: 'sm' })}
                  >
                    Configure
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invites */}
      {inviteRows.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Invites</h2>
          <div className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
            {inviteRows.map((invite) => {
              const isExpired =
                invite.status === 'expired' || new Date(invite.expires_at) <= new Date()
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between px-4 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm truncate">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.status === 'accepted'
                        ? 'Accepted'
                        : isExpired
                          ? 'Expired'
                          : `Expires ${formatTimeUntil(invite.expires_at)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {invite.status !== 'accepted' && (
                      <ResendInviteButton inviteId={invite.id} expired={isExpired} />
                    )}
                    <Badge
                      variant={
                        invite.status === 'accepted'
                          ? 'default'
                          : invite.status === 'expired'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="capitalize"
                    >
                      {invite.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
