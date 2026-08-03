import Link from 'next/link'
import {
  ArrowUpRightIcon,
  BarChart3Icon,
  BotIcon,
  LinkIcon,
  MessagesSquareIcon,
  PanelTopOpenIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'
import { AnalyticsRangeSelector } from '@/components/client/charts/AnalyticsRangeSelector'
import { OrgBotComparisonChart } from '@/components/client/charts/OrgBotComparisonChart'
import {
  parsePriceToCents,
  formatCentsEur,
  isAfterHours,
} from '@/lib/analytics/value-metrics'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Bot } from '@/lib/types'

function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  icon: LucideIcon
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function RateRow({
  label,
  value,
  detail,
}: {
  label: string
  value: number
  detail: string
}) {
  const displayValue = Math.max(0, value)
  const barValue = Math.min(100, displayValue)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{displayValue}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${barValue}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Org-wide analytics rollup: one row per bot, the proof-of-value numbers side
 * by side. The per-bot Analytics section stays the deep-dive; this answers
 * "which of my bots is pulling its weight" at a glance.
 */
export default async function OrgAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  await requireRole('client')
  const { range: rangeParam } = await searchParams
  const rangeDays = ALLOWED_RANGES.includes(Number(rangeParam))
    ? Number(rangeParam)
    : 30

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null
  const supabase = await createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - rangeDays)
  const sinceIso = since.toISOString()

  const { data: botsData } = orgId
    ? await supabase
        .from('bots')
        .select('id, name, config, status')
        .eq('org_id', orgId)
        .order('created_at')
    : { data: [] }
  const bots = (botsData ?? []) as Pick<
    Bot,
    'id' | 'name' | 'config' | 'status'
  >[]
  const botIds = bots.map((b) => b.id)

  const [{ data: convs }, { data: leads }, { data: events }] = botIds.length
    ? await Promise.all([
        supabase
          .from('conversations')
          .select('bot_id, started_at')
          .in('bot_id', botIds)
          .gte('started_at', sinceIso),
        supabase
          .from('leads')
          .select('bot_id')
          .in('bot_id', botIds)
          .gte('created_at', sinceIso),
        supabase
          .from('widget_events')
          .select('bot_id, type, payload')
          .in('bot_id', botIds)
          .gte('created_at', sinceIso),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  type ConvRow = { bot_id: string; started_at: string }
  type LeadRow = { bot_id: string }
  type EventRow = {
    bot_id: string
    type: string
    payload: Record<string, string> | null
  }

  const rows = bots.map((bot) => {
    const botConvs = ((convs ?? []) as ConvRow[]).filter(
      (c) => c.bot_id === bot.id,
    )
    const botLeads = ((leads ?? []) as LeadRow[]).filter(
      (l) => l.bot_id === bot.id,
    )
    const botEvents = ((events ?? []) as EventRow[]).filter(
      (e) => e.bot_id === bot.id,
    )
    const productClickEvents = botEvents.filter(
      (e) => e.type === 'product_click',
    )
    let assistedCents = 0
    for (const e of productClickEvents) {
      const cents = parsePriceToCents(e.payload?.price)
      if (cents) assistedCents += cents
    }
    const afterHours = botConvs.filter((c) =>
      isAfterHours(c.started_at, bot.config.businessHours),
    ).length
    return {
      bot,
      conversations: botConvs.length,
      leads: botLeads.length,
      widgetOpens: botEvents.filter((e) => e.type === 'widget_open').length,
      productClicks: productClickEvents.length,
      linkClicks: botEvents.filter((e) => e.type === 'link_click').length,
      assistedCents,
      afterHours,
      afterHoursPct:
        botConvs.length > 0
          ? Math.round((afterHours / botConvs.length) * 100)
          : 0,
      commerce: Boolean(bot.config.commerce?.enabled),
    }
  })

  const anyCommerce = rows.some((r) => r.commerce)
  const totals = rows.reduce(
    (sum, row) => ({
      conversations: sum.conversations + row.conversations,
      leads: sum.leads + row.leads,
      widgetOpens: sum.widgetOpens + row.widgetOpens,
      linkClicks: sum.linkClicks + row.linkClicks,
      afterHours: sum.afterHours + row.afterHours,
    }),
    {
      conversations: 0,
      leads: 0,
      widgetOpens: 0,
      linkClicks: 0,
      afterHours: 0,
    },
  )
  const percentage = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0
  const chatStartRate = percentage(totals.conversations, totals.widgetOpens)
  const leadCaptureRate = percentage(totals.leads, totals.conversations)
  const afterHoursRate = percentage(totals.afterHours, totals.conversations)
  const activeBots = rows.filter(
    (row) =>
      row.widgetOpens + row.conversations + row.leads + row.linkClicks > 0,
  ).length
  const comparisonData = rows.map((row) => ({
    name: row.bot.name,
    opens: row.widgetOpens,
    conversations: row.conversations,
    leads: row.leads,
    linkClicks: row.linkClicks,
  }))
  const mostActiveBot =
    activeBots > 0
      ? [...rows].sort(
          (a, b) =>
            b.widgetOpens +
            b.conversations +
            b.leads +
            b.linkClicks -
            (a.widgetOpens + a.conversations + a.leads + a.linkClicks),
        )[0]
      : null
  const now = new Date()
  const rangeLabel = `${since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`

  const th = 'text-right text-xs uppercase tracking-wide text-muted-foreground'
  const td = 'text-right text-sm tabular-nums'

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            All bots side by side, {rangeDays}-day window.
          </p>
        </div>
        <AnalyticsRangeSelector range={rangeDays} rangeLabel={rangeLabel} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <BarChart3Icon className="size-5" aria-hidden="true" />
            </span>
            <CardTitle>No analytics yet</CardTitle>
            <CardDescription>
              Create a bot from Home to start collecting engagement data.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section
            aria-label="Organization analytics summary"
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            <MetricCard
              label="Widget opens"
              value={totals.widgetOpens}
              description={`${activeBots} of ${rows.length} ${rows.length === 1 ? 'bot' : 'bots'} had activity`}
              icon={PanelTopOpenIcon}
            />
            <MetricCard
              label="Conversations"
              value={totals.conversations}
              description={`${chatStartRate}% of opens started a chat`}
              icon={MessagesSquareIcon}
            />
            <MetricCard
              label="Leads captured"
              value={totals.leads}
              description={`${leadCaptureRate}% of conversations became leads`}
              icon={UserPlusIcon}
            />
            <MetricCard
              label="Link clicks"
              value={totals.linkClicks}
              description="Links followed from bot replies"
              icon={LinkIcon}
            />
          </section>

          <section
            aria-label="Bot comparison"
            className="grid min-w-0 gap-4 xl:grid-cols-3"
          >
            <Card className="min-w-0 xl:col-span-2">
              <CardHeader>
                <CardTitle>Bot activity</CardTitle>
                <CardDescription>
                  Compare the engagement signals each bot generated during this
                  period.
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">
                    {rows.length} {rows.length === 1 ? 'bot' : 'bots'}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="min-w-0">
                {activeBots > 0 ? (
                  <OrgBotComparisonChart data={comparisonData} />
                ) : (
                  <div className="flex min-h-56 items-center justify-center rounded-lg bg-muted/40 px-6 text-center text-sm text-muted-foreground">
                    No tracked activity in this period yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion snapshot</CardTitle>
                <CardDescription>
                  How activity moved through the key outcomes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <RateRow
                  label="Chat start rate"
                  value={chatStartRate}
                  detail={`${totals.conversations} of ${totals.widgetOpens} opens`}
                />
                <RateRow
                  label="Lead capture rate"
                  value={leadCaptureRate}
                  detail={`${totals.leads} of ${totals.conversations} conversations`}
                />
                <RateRow
                  label="After-hours share"
                  value={afterHoursRate}
                  detail={`${totals.afterHours} conversations outside working hours`}
                />
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-primary ring-1 ring-foreground/10">
                    <BotIcon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Most activity this period
                    </p>
                    <p className="truncate text-sm font-medium">
                      {mostActiveBot?.bot.name ?? 'No activity yet'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Performance by bot</CardTitle>
              <CardDescription>
                Click any row to open that bot&apos;s full analytics breakdown.
              </CardDescription>
              <CardAction>
                <Badge variant="outline">{rangeLabel}</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-muted/40">
                    <TableHead className={`${th} pl-4 text-left`}>
                      Bot
                    </TableHead>
                    <TableHead className={th}>Conversations</TableHead>
                    <TableHead className={th}>Leads</TableHead>
                    <TableHead className={th}>Opens</TableHead>
                    {anyCommerce && (
                      <TableHead className={th}>Product clicks</TableHead>
                    )}
                    {anyCommerce && (
                      <TableHead className={th}>Assisted value</TableHead>
                    )}
                    <TableHead className={th}>Link clicks</TableHead>
                    <TableHead className={th}>After hours</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.bot.id}
                      className="group relative cursor-pointer"
                    >
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                            {r.bot.name.charAt(0).toUpperCase()}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            {/* Stretched link: covers the whole row, so anywhere is clickable */}
                            <Link
                              href={`/app/bots/${r.bot.id}/analytics?range=${rangeDays}`}
                              className="font-medium text-foreground after:absolute after:inset-0 group-hover:text-primary"
                            >
                              {r.bot.name}
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {r.bot.status === 'active'
                                ? 'Live'
                                : r.bot.status === 'paused'
                                  ? 'Paused'
                                  : 'Draft'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className={td}>{r.conversations}</TableCell>
                      <TableCell className={td}>{r.leads}</TableCell>
                      <TableCell className={td}>{r.widgetOpens}</TableCell>
                      {anyCommerce && (
                        <TableCell className={td}>
                          {r.commerce ? r.productClicks : '—'}
                        </TableCell>
                      )}
                      {anyCommerce && (
                        <TableCell className={`${td} font-medium`}>
                          {r.commerce && r.assistedCents > 0
                            ? formatCentsEur(r.assistedCents)
                            : '—'}
                        </TableCell>
                      )}
                      <TableCell className={td}>{r.linkClicks}</TableCell>
                      <TableCell className={td}>{r.afterHoursPct}%</TableCell>
                      <TableCell>
                        <ArrowUpRightIcon
                          className="size-4 text-muted-foreground transition-colors group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex-col items-start gap-1 text-xs text-muted-foreground">
              {anyCommerce && (
                <span>
                  Assisted value estimates the sum of prices on products
                  visitors clicked.
                </span>
              )}
              <span>
                After hours means outside each bot&apos;s configured working
                hours (default Mon–Fri, 08:00–17:00 Europe/Vilnius).
              </span>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  )
}
