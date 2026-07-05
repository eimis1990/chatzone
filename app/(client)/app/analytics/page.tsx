import Link from 'next/link'
import { BarChart3Icon } from 'lucide-react'
import { requireRole, getUserOrgIds } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'
import { AnalyticsRangeSelector } from '@/components/client/charts/AnalyticsRangeSelector'
import { parsePriceToCents, formatCentsEur, isAfterHours } from '@/lib/analytics/value-metrics'
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

  const th = 'px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-muted-foreground'
  const td = 'px-3 py-2.5 text-right text-sm tabular-nums'

  return (
    <div className="max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <BarChart3Icon className="size-5 text-primary" aria-hidden="true" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">All bots side by side, {rangeDays}-day window.</p>
        </div>
        <AnalyticsRangeSelector range={rangeDays} rangeLabel={rangeLabel} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No bots yet — create one from Home to start collecting data.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-b">
                <th className={`${th} text-left`}>Bot</th>
                <th className={th}>Conversations</th>
                <th className={th}>Leads</th>
                <th className={th}>Opens</th>
                {anyCommerce && <th className={th}>Product clicks</th>}
                {anyCommerce && <th className={th}>Assisted value</th>}
                <th className={th}>Link clicks</th>
                <th className={th}>After hours</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.bot.id} className="border-b last:border-b-0 transition-colors hover:bg-muted/40">
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/app/bots/${r.bot.id}/analytics?range=${rangeDays}`}
                      className="text-sm font-medium hover:text-primary hover:underline"
                    >
                      {r.bot.name}
                    </Link>
                  </td>
                  <td className={td}>{r.conversations}</td>
                  <td className={td}>{r.leads}</td>
                  <td className={td}>{r.widgetOpens}</td>
                  {anyCommerce && <td className={td}>{r.commerce ? r.productClicks : '—'}</td>}
                  {anyCommerce && (
                    <td className={`${td} font-medium`}>
                      {r.commerce && r.assistedCents > 0 ? formatCentsEur(r.assistedCents) : '—'}
                    </td>
                  )}
                  <td className={td}>{r.linkClicks}</td>
                  <td className={td}>{r.afterHoursPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Assisted value is an estimate: the sum of prices of products visitors clicked in the chat. After
        hours = outside each bot&apos;s configured working hours (Mon–Fri, default 08:00–17:00,
        Europe/Vilnius). Click a bot for the full breakdown.
      </p>
    </div>
  )
}
