import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePriceToCents, isAfterHours } from '@/lib/analytics/value-metrics'
import type { Bot } from '@/lib/types'

/**
 * Org-wide analytics rollup shared by Home and /app/analytics: one row per
 * bot plus totals and conversion rates for the period. Extracted from the
 * analytics page so both screens aggregate identically.
 */

export interface OrgBotRow {
  bot: Pick<Bot, 'id' | 'name' | 'config' | 'status'>
  conversations: number
  leads: number
  widgetOpens: number
  productClicks: number
  /** Product cards shown in bot replies (messages.products). */
  productSuggestions: number
  linkClicks: number
  assistedCents: number
  afterHours: number
  afterHoursPct: number
  commerce: boolean
}

export interface OrgAnalyticsRollup {
  rows: OrgBotRow[]
  totals: {
    conversations: number
    leads: number
    widgetOpens: number
    linkClicks: number
    productClicks: number
    productSuggestions: number
    afterHours: number
  }
  chatStartRate: number
  leadCaptureRate: number
  /** Product clicks as a share of product cards shown. */
  productClickRate: number
  afterHoursRate: number
  activeBots: number
  mostActiveBot: OrgBotRow | null
  comparisonData: Array<{
    name: string
    opens: number
    conversations: number
    leads: number
    linkClicks: number
  }>
  anyCommerce: boolean
}

export async function getOrgAnalyticsRollup(
  supabase: SupabaseClient,
  orgId: string | null,
  rangeDays: number,
): Promise<OrgAnalyticsRollup> {
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
  const bots = (botsData ?? []) as Pick<Bot, 'id' | 'name' | 'config' | 'status'>[]
  const botIds = bots.map((b) => b.id)

  const [{ data: convs }, { data: leads }, { data: events }, { data: productMsgs }] = botIds.length
    ? await Promise.all([
        supabase
          .from('conversations')
          .select('bot_id, started_at')
          .in('bot_id', botIds)
          .neq('source', 'preview') // configurator test calls aren't customer traffic
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
        // Only replies that carried product cards; bot scoping via the inner join.
        supabase
          .from('messages')
          .select('products, conversations!inner(bot_id)')
          .in('conversations.bot_id', botIds)
          .neq('products', '[]')
          .gte('created_at', sinceIso),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }]

  type ConvRow = { bot_id: string; started_at: string }
  type LeadRow = { bot_id: string }
  type EventRow = { bot_id: string; type: string; payload: Record<string, string> | null }
  type ProductMsgRow = { products: unknown[] | null; conversations: { bot_id: string } | null }

  const rows: OrgBotRow[] = bots.map((bot) => {
    const botConvs = ((convs ?? []) as ConvRow[]).filter((c) => c.bot_id === bot.id)
    const botLeads = ((leads ?? []) as LeadRow[]).filter((l) => l.bot_id === bot.id)
    const botEvents = ((events ?? []) as EventRow[]).filter((e) => e.bot_id === bot.id)
    const productClickEvents = botEvents.filter((e) => e.type === 'product_click')
    const productSuggestions = ((productMsgs ?? []) as unknown as ProductMsgRow[])
      .filter((m) => m.conversations?.bot_id === bot.id)
      .reduce((n, m) => n + (m.products?.length ?? 0), 0)
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
      productSuggestions,
      linkClicks: botEvents.filter((e) => e.type === 'link_click').length,
      assistedCents,
      afterHours,
      afterHoursPct:
        botConvs.length > 0 ? Math.round((afterHours / botConvs.length) * 100) : 0,
      commerce: Boolean(bot.config.commerce?.enabled),
    }
  })

  const totals = rows.reduce(
    (sum, row) => ({
      conversations: sum.conversations + row.conversations,
      leads: sum.leads + row.leads,
      widgetOpens: sum.widgetOpens + row.widgetOpens,
      linkClicks: sum.linkClicks + row.linkClicks,
      productClicks: sum.productClicks + row.productClicks,
      productSuggestions: sum.productSuggestions + row.productSuggestions,
      afterHours: sum.afterHours + row.afterHours,
    }),
    {
      conversations: 0,
      leads: 0,
      widgetOpens: 0,
      linkClicks: 0,
      productClicks: 0,
      productSuggestions: 0,
      afterHours: 0,
    },
  )
  const percentage = (value: number, total: number) =>
    total > 0 ? Math.round((value / total) * 100) : 0
  const activeBots = rows.filter(
    (row) => row.widgetOpens + row.conversations + row.leads + row.linkClicks > 0,
  ).length
  const activity = (row: OrgBotRow) =>
    row.widgetOpens + row.conversations + row.leads + row.linkClicks

  return {
    rows,
    totals,
    chatStartRate: percentage(totals.conversations, totals.widgetOpens),
    leadCaptureRate: percentage(totals.leads, totals.conversations),
    productClickRate: percentage(totals.productClicks, totals.productSuggestions),
    afterHoursRate: percentage(totals.afterHours, totals.conversations),
    activeBots,
    mostActiveBot:
      activeBots > 0 ? [...rows].sort((a, b) => activity(b) - activity(a))[0] : null,
    comparisonData: rows.map((row) => ({
      name: row.bot.name,
      opens: row.widgetOpens,
      conversations: row.conversations,
      leads: row.leads,
      linkClicks: row.linkClicks,
    })),
    anyCommerce: rows.some((r) => r.commerce),
  }
}
