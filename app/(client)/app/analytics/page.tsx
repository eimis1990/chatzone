import Link from 'next/link'
import { ArrowUpRightIcon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'
import { AnalyticsRangeSelector } from '@/components/client/charts/AnalyticsRangeSelector'
import { parsePriceToCents, formatCentsEur, isAfterHours } from '@/lib/analytics/value-metrics'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Bot } from '@/lib/types'

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
  const rangeDays = ALLOWED_RANGES.includes(Number(rangeParam)) ? Number(rangeParam) : 30

  const orgIds = await getUserOrgIds()
  const orgId = orgIds[0] ?? null
  const supabase = await createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - rangeDays)
  const sinceIso = since.toISOString()

  const { data: botsData } = orgId
    ? await supabase.from('bots').select('id, name, config').eq('org_id', orgId).order('created_at')
    : { data: [] }
  const bots = (botsData ?? []) as Pick<Bot, 'id' | 'name' | 'config'>[]
  const botIds = bots.map((b) => b.id)

  const [{ data: convs }, { data: leads }, { data: events }] = botIds.length
    ? await Promise.all([
        supabase
          .from('conversations')
          .select('bot_id, started_at')
          .in('bot_id', botIds)
          .gte('started_at', sinceIso),
        supabase.from('leads').select('bot_id').in('bot_id', botIds).gte('created_at', sinceIso),
        supabase
          .from('widget_events')
          .select('bot_id, type, payload')
          .in('bot_id', botIds)
          .gte('created_at', sinceIso),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  type ConvRow = { bot_id: string; started_at: string }
  type LeadRow = { bot_id: string }
  type EventRow = { bot_id: string; type: string; payload: Record<string, string> | null }

  const rows = bots.map((bot) => {
    const botConvs = ((convs ?? []) as ConvRow[]).filter((c) => c.bot_id === bot.id)
    const botLeads = ((leads ?? []) as LeadRow[]).filter((l) => l.bot_id === bot.id)
    const botEvents = ((events ?? []) as EventRow[]).filter((e) => e.bot_id === bot.id)
    const productClickEvents = botEvents.filter((e) => e.type === 'product_click')
    let assistedCents = 0
    for (const e of productClickEvents) {
      const cents = parsePriceToCents(e.payload?.price)
      if (cents) assistedCents += cents
    }
    const afterHours = botConvs.filter((c) => isAfterHours(c.started_at, bot.config.businessHours)).length
    return {
      bot,
      conversations: botConvs.length,
      leads: botLeads.length,
      widgetOpens: botEvents.filter((e) => e.type === 'widget_open').length,
      productClicks: productClickEvents.length,
      linkClicks: botEvents.filter((e) => e.type === 'link_click').length,
      assistedCents,
      afterHoursPct: botConvs.length > 0 ? Math.round((afterHours / botConvs.length) * 100) : 0,
      commerce: Boolean(bot.config.commerce?.enabled),
    }
  })

  const anyCommerce = rows.some((r) => r.commerce)
  const now = new Date()
  const rangeLabel = `${since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`

  const th = 'text-right text-xs uppercase tracking-wide text-muted-foreground'
  const td = 'text-right text-sm tabular-nums'

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">All bots side by side, {rangeDays}-day window.</p>
        </div>
        <AnalyticsRangeSelector range={rangeDays} rangeLabel={rangeLabel} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No bots yet — create one from Home to start collecting data.
        </div>
      ) : (
        <Card className="overflow-hidden shadow-none">
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>
              {rows.length} {rows.length === 1 ? 'bot' : 'bots'}, {rangeLabel}. Click a bot for the full
              breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-muted/30">
                    <TableHead className={`${th} border-r pl-4 text-left`}>Bot</TableHead>
                    <TableHead className={`${th} border-r`}>Conversations</TableHead>
                    <TableHead className={`${th} border-r`}>Leads</TableHead>
                    <TableHead className={`${th} border-r`}>Opens</TableHead>
                    {anyCommerce && <TableHead className={`${th} border-r`}>Product clicks</TableHead>}
                    {anyCommerce && <TableHead className={`${th} border-r`}>Assisted value</TableHead>}
                    <TableHead className={`${th} border-r`}>Link clicks</TableHead>
                    <TableHead className={th}>After hours</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Open</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.bot.id} className="group relative cursor-pointer">
                      <TableCell className="border-r pl-4">
                        {/* Stretched link: covers the whole row, so anywhere is clickable */}
                        <Link
                          href={`/app/bots/${r.bot.id}/analytics?range=${rangeDays}`}
                          className="font-medium text-foreground after:absolute after:inset-0 group-hover:text-primary"
                        >
                          {r.bot.name}
                        </Link>
                      </TableCell>
                      <TableCell className={`${td} border-r`}>{r.conversations}</TableCell>
                      <TableCell className={`${td} border-r`}>{r.leads}</TableCell>
                      <TableCell className={`${td} border-r`}>{r.widgetOpens}</TableCell>
                      {anyCommerce && (
                        <TableCell className={`${td} border-r`}>
                          {r.commerce ? r.productClicks : '—'}
                        </TableCell>
                      )}
                      {anyCommerce && (
                        <TableCell className={`${td} border-r font-medium`}>
                          {r.commerce && r.assistedCents > 0 ? formatCentsEur(r.assistedCents) : '—'}
                        </TableCell>
                      )}
                      <TableCell className={`${td} border-r`}>{r.linkClicks}</TableCell>
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
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            Assisted value is an estimate: the sum of prices of products visitors clicked in the chat.
            After hours = outside each bot&apos;s configured working hours (Mon–Fri, default 08:00–17:00,
            Europe/Vilnius).
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
