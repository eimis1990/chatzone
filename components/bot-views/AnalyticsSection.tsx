import {
  MessagesSquareIcon,
  MessageSquareIcon,
  UserPlusIcon,
  ShoppingBagIcon,
  GaugeIcon,
  ThumbsUpIcon,
  LifeBuoyIcon,
  HeadsetIcon,
} from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import { toDateString } from '@/lib/date-utils'
import { StatCard } from '@/components/client/charts/StatCard'
import { AnalyticsRangeSelector } from '@/components/client/charts/AnalyticsRangeSelector'
import { ExportReportButton } from '@/components/client/charts/ExportReportButton'
import { ConversationsChart } from '@/components/client/charts/ConversationsChart'
import { MessageVolumeChart } from '@/components/client/charts/MessageVolumeChart'
import { TopQuestionsChart } from '@/components/client/charts/TopQuestionsChart'
import { LeadsChart } from '@/components/client/charts/LeadsChart'
import type { Bot, Conversation, Message, Lead } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

export const ALLOWED_RANGES = [7, 30, 90]

// Generate an array of date strings for the last N days (YYYY-MM-DD).
function lastNDays(n: number): string[] {
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(toDateString(d.toISOString()))
  }
  return dates
}

// Group items by a date string key and count them.
function countByDate<T>(items: T[], getDate: (item: T) => string, dates: string[]) {
  const map: Record<string, number> = {}
  for (const date of dates) map[date] = 0
  for (const item of items) {
    const d = getDate(item).slice(0, 10)
    if (d in map) map[d]++
  }
  return dates.map((date) => ({ date, count: map[date] }))
}

// Percent change vs. previous period (null when not meaningful).
function trendOf(curr: number, prev: number): { value: number; direction: 'up' | 'down' } | null {
  if (prev === 0) return curr > 0 ? { value: 100, direction: 'up' } : null
  const pct = Math.round(((curr - prev) / prev) * 100)
  if (pct === 0) return null
  return { value: pct, direction: pct >= 0 ? 'up' : 'down' }
}

/**
 * Shared Analytics view — used by the client bot pages AND the owner's
 * platform-bot section. Callers do the role guard + bot resolution; all data
 * reads go through the RLS server client (org-membership scoped).
 */
export async function AnalyticsSection({
  bot,
  rangeDays,
}: {
  bot: Pick<Bot, 'id' | 'name' | 'config'>
  rangeDays: number
}) {
  const supabase = await createServerClient()

  const dates = lastNDays(rangeDays)
  const since = new Date()
  since.setDate(since.getDate() - rangeDays)
  const sinceIso = since.toISOString()
  // Previous, equal-length window (for trend deltas).
  const prevSince = new Date(since)
  prevSince.setDate(prevSince.getDate() - rangeDays)
  const prevSinceIso = prevSince.toISOString()

  // Current-period data + cheap previous-period counts, in parallel.
  const [
    { data: conversations },
    { data: leads },
    { count: prevConvCount },
    { count: prevLeadCount },
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, started_at, last_message_at, topics, success_score, handoff_status')
      .eq('bot_id', bot.id)
      .gte('started_at', sinceIso),
    supabase.from('leads').select('id, created_at').eq('bot_id', bot.id).gte('created_at', sinceIso),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot.id)
      .gte('started_at', prevSinceIso)
      .lt('started_at', sinceIso),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('bot_id', bot.id)
      .gte('created_at', prevSinceIso)
      .lt('created_at', sinceIso),
  ])

  const typedConvs = (conversations ?? []) as Pick<
    Conversation,
    'id' | 'started_at' | 'last_message_at' | 'topics' | 'success_score' | 'handoff_status'
  >[]
  const convIds = typedConvs.map((c) => c.id)

  const { data: messagesReal } = convIds.length > 0
    ? await supabase
        .from('messages')
        .select('id, conversation_id, role, content, created_at, feedback, products')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  const typedMsgs = (messagesReal ?? []) as (Pick<
    Message,
    'id' | 'conversation_id' | 'role' | 'content' | 'created_at' | 'feedback'
  > & { products?: CommerceProduct[] | null })[]
  const typedLeads = (leads ?? []) as Pick<Lead, 'id' | 'created_at'>[]

  // --- Aggregations ---

  const convsByDay = countByDate(typedConvs, (c) => c.started_at, dates)
  const msgsByDay = countByDate(typedMsgs, (m) => m.created_at, dates)
  const leadsByDay = countByDate(typedLeads, (l) => l.created_at, dates)

  // Top 10 user questions (most frequent user message content)
  const userMsgs = typedMsgs.filter((m) => m.role === 'user')
  const questionFreq: Record<string, number> = {}
  for (const msg of userMsgs) {
    const q = msg.content.trim()
    questionFreq[q] = (questionFreq[q] ?? 0) + 1
  }
  const topQuestions = Object.entries(questionFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }))

  // Product suggestions surfaced by the bot.
  const productFreq = new Map<string, { product: CommerceProduct; count: number }>()
  let totalSuggestions = 0
  let repliesWithProducts = 0
  for (const m of typedMsgs) {
    const prods = m.products ?? []
    if (prods.length > 0) repliesWithProducts++
    for (const p of prods) {
      totalSuggestions++
      const key = p.id || p.title
      const existing = productFreq.get(key)
      if (existing) existing.count++
      else productFreq.set(key, { product: p, count: 1 })
    }
  }
  const topProducts = [...productFreq.values()].sort((a, b) => b.count - a.count).slice(0, 6)
  const showProducts = Boolean(bot.config.commerce?.enabled) || totalSuggestions > 0

  // Fallback rate
  const fallbackMsgs = Object.values(bot.config.content ?? {})
    .map((c) => c?.fallbackMessage?.trim())
    .filter((m): m is string => !!m)
  const assistantMsgs = typedMsgs.filter((m) => m.role === 'assistant')
  const fallbackCount = fallbackMsgs.length
    ? assistantMsgs.filter((m) => fallbackMsgs.includes(m.content.trim())).length
    : 0
  const fallbackRate =
    assistantMsgs.length > 0 ? Math.round((fallbackCount / assistantMsgs.length) * 100) : 0

  // CSAT from thumbs feedback
  const thumbsUp = typedMsgs.filter((m) => m.feedback === 'up').length
  const thumbsDown = typedMsgs.filter((m) => m.feedback === 'down').length
  const ratedTotal = thumbsUp + thumbsDown
  const csat = ratedTotal > 0 ? Math.round((thumbsUp / ratedTotal) * 100) : null

  // Average AI success score
  const scoredConvs = typedConvs.filter((c) => typeof c.success_score === 'number' && (c.success_score ?? 0) > 0)
  const avgScore =
    scoredConvs.length > 0
      ? scoredConvs.reduce((sum, c) => sum + (c.success_score ?? 0), 0) / scoredConvs.length
      : null

  // Top topics
  const topicFreq: Record<string, number> = {}
  for (const c of typedConvs) {
    for (const t of c.topics ?? []) {
      const tag = t.trim().toLowerCase()
      if (tag) topicFreq[tag] = (topicFreq[tag] ?? 0) + 1
    }
  }
  const topTopics = Object.entries(topicFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 12)
    .map(([topic, count]) => ({ topic, count }))

  // Human-readable date span for the header.
  const now = new Date()
  const rangeLabel = `${since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(
    undefined,
    { month: 'short', day: 'numeric', year: 'numeric' },
  )}`

  const convTrend = trendOf(typedConvs.length, prevConvCount ?? 0)
  const leadTrend = trendOf(typedLeads.length, prevLeadCount ?? 0)

  // Conversations that reached a human agent at some point.
  const handoffConvs = typedConvs.filter((c) => c.handoff_status && c.handoff_status !== 'bot').length

  // Rows for the CSV export of this period.
  const exportRows = [
    { label: 'Date range', value: rangeLabel },
    { label: 'Conversations', value: typedConvs.length },
    { label: 'Messages', value: typedMsgs.length },
    { label: 'Leads', value: typedLeads.length },
    ...(showProducts
      ? [
          { label: 'Product suggestions', value: totalSuggestions },
          { label: 'Replies with products', value: repliesWithProducts },
        ]
      : []),
    { label: 'Human handoffs', value: handoffConvs },
    { label: 'AI success (avg /5)', value: avgScore === null ? 'n/a' : avgScore.toFixed(1) },
    { label: 'CSAT (%)', value: csat === null ? 'n/a' : csat },
    { label: 'Fallback rate (%)', value: fallbackRate },
    ...topQuestions.map((q, i) => ({ label: `Top question #${i + 1}`, value: `${q.question} (${q.count})` })),
    ...topProducts.map((p, i) => ({
      label: `Top product #${i + 1}`,
      value: `${p.product.title} (${p.count})`,
    })),
  ]
  const exportFilename = `analytics-${bot.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${rangeDays}d.csv`

  return (
    <div className="space-y-6 p-6">
      {/* Header with interval selector */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">How your assistant is performing</p>
        </div>
        <div className="flex items-center gap-2">
          <AnalyticsRangeSelector range={rangeDays} rangeLabel={rangeLabel} />
          <ExportReportButton rows={exportRows} filename={exportFilename} />
        </div>
      </div>

      {/* Scalar stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="Conversations"
          value={typedConvs.length}
          icon={MessagesSquareIcon}
          accent="green"
          trend={convTrend}
          sub="vs. previous period"
        />
        <StatCard label="Messages" value={typedMsgs.length} icon={MessageSquareIcon} accent="blue" sub="this period" />
        <StatCard
          label="Leads"
          value={typedLeads.length}
          icon={UserPlusIcon}
          accent="violet"
          trend={leadTrend}
          sub="vs. previous period"
        />
        {/* AI Success in the top-right corner */}
        <StatCard
          label="AI Success"
          value={avgScore === null ? '—' : `${avgScore.toFixed(1)}/5`}
          icon={GaugeIcon}
          accent="green"
          highlight
          sub={scoredConvs.length > 0 ? `${scoredConvs.length} evaluated` : 'none evaluated yet'}
        />
        {showProducts && (
          <StatCard
            label="Product Suggestions"
            value={totalSuggestions}
            icon={ShoppingBagIcon}
            accent="amber"
            sub={repliesWithProducts > 0 ? `across ${repliesWithProducts} replies` : 'none yet'}
          />
        )}
        <StatCard
          label="Human Handoffs"
          value={handoffConvs}
          icon={HeadsetIcon}
          accent="blue"
          sub={typedConvs.length > 0 ? `of ${typedConvs.length} chats` : 'no chats yet'}
        />
        <StatCard
          label="CSAT"
          value={csat === null ? '—' : `${csat}%`}
          icon={ThumbsUpIcon}
          accent="rose"
          sub={ratedTotal > 0 ? `${thumbsUp}👍 / ${thumbsDown}👎` : 'no ratings yet'}
        />
        <StatCard
          label="Fallback Rate"
          value={`${fallbackRate}%`}
          icon={LifeBuoyIcon}
          accent="slate"
          sub={`${fallbackCount} of ${assistantMsgs.length} replies`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Conversations over time</h3>
          <ConversationsChart data={convsByDay} />
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Message volume</h3>
          <MessageVolumeChart data={msgsByDay} />
        </div>
      </div>

      {/* Charts row 2: top questions + (products | leads), equal height */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 rounded-xl border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold">Top visitor questions</h3>
          <TopQuestionsChart data={topQuestions} />
        </div>

        {showProducts ? (
          <div className="flex flex-col space-y-3 rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <ShoppingBagIcon className="size-4 text-amber-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Top suggested products</h3>
            </div>
            {topProducts.length === 0 ? (
              <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-muted-foreground">
                No product suggestions in this period yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map(({ product, count }) => (
                  <li key={product.id || product.title}>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/50"
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.imageUrl} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                      ) : (
                        <div className="size-10 shrink-0 rounded-md bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{product.title}</p>
                        <p className="text-xs text-muted-foreground">{product.price}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-700 tabular-nums">
                        {count}×
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold">Leads captured</h3>
            <LeadsChart data={leadsByDay} />
          </div>
        )}
      </div>

      {/* Top topics */}
      {topTopics.length > 0 && (
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Top topics</h3>
          <div className="flex flex-wrap gap-2">
            {topTopics.map(({ topic, count }) => (
              <span
                key={topic}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm"
              >
                {topic}
                <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
