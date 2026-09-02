import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BarChart3Icon,
  BotIcon,
  Building2Icon,
  CalendarDaysIcon,
  KeyRoundIcon,
  MailIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PlusIcon,
  Settings2Icon,
  SparklesIcon,
  UserRoundCheckIcon,
} from 'lucide-react'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { StatTileGrid, type StatTileData } from '@/components/client/charts/StatCard'
import { LiveIndicator } from '@/components/LiveIndicator'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { formatDistanceToNow, formatTimeUntil } from '@/lib/date-utils'
import { SuspendToggle } from '@/components/owner/SuspendToggle'
import { ResendInviteButton } from '@/components/owner/ResendInviteButton'
import { DuplicateDemoBotForm } from '@/components/owner/DuplicateDemoBotForm'
import { CreateBotDialog } from '@/components/client/CreateBotDialog'
import { createBotForOrg, createBotFromDemo } from './actions'
import { SETUP_PACKAGES } from '@/lib/setup-packages'
import { cn, readableTextColor } from '@/lib/utils'
import type { Bot, Invite } from '@/lib/types'

interface SetupOrderRow {
  id: string
  package: string
  amount_cents: number
  currency: string
  status: string
  created_at: string
}

const setupName = (pkg: string) => SETUP_PACKAGES.find((p) => p.id === pkg)?.name ?? pkg
const money = (cents: number, currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'eur').toUpperCase() }).format(
    cents / 100,
  )

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

  // "Create from demo": duplicate a prepared showcase bot (config + knowledge +
  // product index) into this client's org, then jump straight to its editor.
  async function createFromDemo(demoBotId: string) {
    'use server'
    if (!demoBotId) return { error: 'Choose a demo bot first.' }
    const res = await createBotFromDemo(orgId, demoBotId)
    if (res.id) redirect(`/owner/clients/${orgId}/bots/${res.id}/configure`)
    return res
  }

  const supabase = await createServerClient()

  // Owner sees all rows via RLS — parallel fetches
  const [{ data: orgStat }, { data: bots }, { data: invites }, { data: setupOrders }] =
    await Promise.all([
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
      supabase
        .from('setup_orders')
        .select('id, package, amount_cents, currency, status, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false }),
    ])

  // Demo bots available to duplicate into this client (empty → picker hidden).
  const { data: demoOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('is_demo', true)
    .maybeSingle<{ id: string }>()
  const { data: demoBots } = demoOrg
    ? await supabase
        .from('bots')
        .select('id, name')
        .eq('org_id', demoOrg.id)
        .order('name')
    : { data: [] as { id: string; name: string }[] }

  if (!orgStat) notFound()

  const botRows = (bots ?? []) as Pick<
    Bot,
    'id' | 'name' | 'status' | 'config' | 'created_at' | 'public_key' | 'last_seen_at'
  >[]
  const inviteRows = (invites ?? []) as Pick<Invite, 'id' | 'email' | 'status' | 'expires_at' | 'created_at'>[]
  const setupRows = (setupOrders ?? []) as SetupOrderRow[]
  const statTiles: StatTileData[] = [
    { label: 'Bots', value: orgStat.bots, icon: BotIcon, accent: 'green' },
    {
      label: 'Conversations',
      value: orgStat.conversations,
      icon: MessageCircleIcon,
      accent: 'blue',
    },
    {
      label: 'Messages',
      value: orgStat.messages,
      icon: MessagesSquareIcon,
      accent: 'violet',
    },
    { label: 'Leads', value: orgStat.leads, icon: UserRoundCheckIcon, accent: 'amber' },
  ]
  const demoOptions = (demoBots ?? []).map((bot) => ({ id: bot.id, name: bot.name }))

  return (
    <div className="flex max-w-7xl flex-col gap-6 p-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/owner/clients" className="inline-flex items-center gap-1.5 hover:text-foreground">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Clients
        </Link>
        <span aria-hidden="true">/</span>
        <span className="font-medium text-foreground">{orgStat.org_name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2Icon className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{orgStat.org_name}</h1>
              <Badge variant={orgStat.status === 'active' ? 'default' : 'secondary'}>
                {orgStat.status === 'active' ? 'Active' : 'Suspended'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Client workspace
              {orgStat.last_activity_at
                ? ` · Last activity ${formatDistanceToNow(orgStat.last_activity_at)}`
                : ' · No activity yet'}
            </p>
          </div>
        </div>
        <SuspendToggle
          orgId={orgId}
          currentStatus={orgStat.status as 'active' | 'suspended'}
        />
      </div>

      {/* Compact account overview */}
      <StatTileGrid stats={statTiles} />

      {/* Bots list */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CardTitle>Bots</CardTitle>
              <Badge variant="secondary">{botRows.length}</Badge>
            </div>
            <CardDescription>Manage this client&apos;s assistants and installation status.</CardDescription>
          </div>
          <div className="shrink-0">
            <CreateBotDialog
              orgId={orgId}
              action={createBot}
              configureBase={`/owner/clients/${orgId}/bots`}
              trigger={
                <button
                  type="button"
                  className={cn(buttonVariants(), 'h-11')}
                >
                  <PlusIcon data-icon="inline-start" />
                  New bot
                </button>
              }
            />
          </div>
        </CardHeader>

        {botRows.length === 0 ? (
          <CardContent className="px-0">
            <Empty className="border-y py-12">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BotIcon />
                </EmptyMedia>
                <EmptyTitle>No bots yet</EmptyTitle>
                <EmptyDescription>
                  Create a blank bot or duplicate a prepared demo for this client.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-3">
            {botRows.map((bot) => {
              const lang = bot.config.defaultLanguage ?? 'en'
              const greeting =
                bot.config.content?.[lang]?.greeting ?? bot.config.content?.en?.greeting ?? ''
              const avatar = bot.config.avatarUrl || bot.config.botAvatarUrl
              const brand = bot.config.theme?.primaryColor ?? '#e97634'
              const isActive = bot.status === 'active'
              return (
                <div
                  key={bot.id}
                  className={cn(
                    'relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4 transition-all hover:-translate-y-px hover:shadow-md sm:flex-row sm:items-center sm:p-5',
                    isActive ? 'bg-card' : 'bg-muted',
                  )}
                >
                  {isActive && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl"
                      style={{ backgroundColor: brand }}
                    />
                  )}
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt=""
                      className="relative size-12 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
                    />
                  ) : (
                    <span
                      className="relative flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold"
                      style={{ backgroundColor: `${brand}1a`, color: brand }}
                    >
                      {bot.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="relative flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold">{bot.name}</p>
                      <Badge
                        variant={isActive ? 'default' : 'secondary'}
                        style={
                          isActive
                            ? { backgroundColor: brand, color: readableTextColor(brand) }
                            : undefined
                        }
                      >
                        {isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <LiveIndicator lastSeenAt={bot.last_seen_at} />
                    </div>
                    {greeting && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">{greeting}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-0.5 font-mono"
                        title={bot.public_key}
                      >
                        <KeyRoundIcon className="size-3" aria-hidden="true" />
                        {bot.public_key.slice(0, 8)}…{bot.public_key.slice(-4)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarDaysIcon className="size-3.5" aria-hidden="true" />
                        Created {formatDistanceToNow(bot.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex shrink-0 gap-2 sm:flex-col md:flex-row">
                    <Link
                      href={`/owner/clients/${orgId}/bots/${bot.id}/analytics`}
                      className={cn(buttonVariants({ variant: 'outline' }), 'h-10 flex-1 sm:flex-none')}
                    >
                      <BarChart3Icon data-icon="inline-start" />
                      Analytics
                    </Link>
                    <Link
                      href={`/owner/clients/${orgId}/bots/${bot.id}/configure`}
                      className={cn(buttonVariants(), 'h-10 flex-1 sm:flex-none')}
                    >
                      <Settings2Icon data-icon="inline-start" />
                      Configure
                    </Link>
                  </div>
                </div>
              )
            })}
          </CardContent>
        )}

        {demoOptions.length > 0 && (
          <CardFooter className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <SparklesIcon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Start from a prepared demo</p>
                <p className="text-xs text-muted-foreground">
                  Copy its configuration and knowledge into this workspace.
                </p>
              </div>
            </div>
            <DuplicateDemoBotForm demos={demoOptions} action={createFromDemo} />
          </CardFooter>
        )}
      </Card>

      <div
        className={cn(
          'grid gap-6',
          inviteRows.length > 0 && setupRows.length > 0 && 'lg:grid-cols-2',
        )}
      >
        {/* Invites */}
        {inviteRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Invites</CardTitle>
              <CardDescription>Workspace access sent to this client&apos;s team.</CardDescription>
              <CardAction>
                <Badge variant="secondary">{inviteRows.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <div className="divide-y border-t">
                {inviteRows.map((invite) => {
                  const isExpired =
                    invite.status === 'expired' || new Date(invite.expires_at) <= new Date()
                  return (
                    <div
                      key={invite.id}
                      className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:px-6"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <MailIcon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Invited {formatDistanceToNow(invite.created_at)}
                            {invite.status !== 'accepted' &&
                              (isExpired
                                ? ' · Invitation expired'
                                : ` · Expires ${formatTimeUntil(invite.expires_at)}`)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
                        <Badge
                          variant={
                            invite.status === 'accepted'
                              ? 'default'
                              : invite.status === 'expired'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {invite.status === 'accepted'
                            ? 'Accepted'
                            : isExpired
                              ? 'Expired'
                              : 'Pending'}
                        </Badge>
                        {invite.status !== 'accepted' && (
                          <ResendInviteButton inviteId={invite.id} expired={isExpired} />
                        )}
                      </div>
                    </div>
                  )
                })}
                  </div>
            </CardContent>
          </Card>
        )}

        {/* Done-for-you setup purchases */}
        {setupRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Setup purchases</CardTitle>
              <CardDescription>Done-for-you services purchased by this workspace.</CardDescription>
              <CardAction>
                <Badge variant="secondary">{setupRows.length}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <div className="divide-y border-t">
                {setupRows.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-4 sm:px-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <SparklesIcon className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{setupName(o.package)} setup</p>
                      <p className="text-xs text-muted-foreground">
                        {money(o.amount_cents, o.currency)} · Purchased{' '}
                        {formatDistanceToNow(o.created_at)}
                      </p>
                    </div>
                    <Badge variant={o.status === 'paid' ? 'default' : 'secondary'}>
                      {o.status === 'paid'
                        ? 'Paid'
                        : o.status.charAt(0).toUpperCase() + o.status.slice(1)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
