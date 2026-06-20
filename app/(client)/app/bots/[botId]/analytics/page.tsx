import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { toDateString } from '@/lib/date-utils'
import { StatCard } from '@/components/client/charts/StatCard'
import { ConversationsChart } from '@/components/client/charts/ConversationsChart'
import { MessageVolumeChart } from '@/components/client/charts/MessageVolumeChart'
import { TopQuestionsChart } from '@/components/client/charts/TopQuestionsChart'
import { LeadsChart } from '@/components/client/charts/LeadsChart'
import { KbReadinessChart } from '@/components/client/charts/KbReadinessChart'
import type { Bot, Conversation, Message, Lead, KnowledgeSource } from '@/lib/types'

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

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()

  // Verify bot access via RLS
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, config')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config'>>()

  if (!bot) notFound()

  const dates30 = lastNDays(30)
  const since30 = new Date()
  since30.setDate(since30.getDate() - 30)
  const since30Iso = since30.toISOString()

  // Parallel data fetching — keep aggregation light, push work to DB where trivial.
  const [
    { data: conversations },
    { data: messages },
    { data: leads },
    { data: sources },
  ] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, started_at, last_message_at')
      .eq('bot_id', botId)
      .gte('started_at', since30Iso),
    supabase
      .from('messages')
      .select('id, conversation_id, role, content, created_at')
      .in(
        'conversation_id',
        // subquery via supabase RPC is not available here; we do a two-step
        // but keep it simple: fetch conversation IDs first (already loaded above)
        // We'll re-use conversations loaded in the next step; this is a workaround
        // to avoid a second round-trip for conv IDs.
        ['00000000-0000-0000-0000-000000000000'], // placeholder; overwritten below
      )
      .order('created_at', { ascending: true }),
    supabase
      .from('leads')
      .select('id, created_at')
      .eq('bot_id', botId)
      .gte('created_at', since30Iso),
    supabase
      .from('knowledge_sources')
      .select('id, status')
      .eq('bot_id', botId),
  ])

  // Re-fetch messages properly scoped to this bot's conversations in the last 30 days
  const convIds30 = (conversations ?? []).map((c) => (c as Conversation).id)

  const { data: messagesReal } = convIds30.length > 0
    ? await supabase
        .from('messages')
        .select('id, conversation_id, role, content, created_at')
        .in('conversation_id', convIds30)
        .order('created_at', { ascending: true })
    : { data: [] }

  const typedConvs = (conversations ?? []) as Pick<Conversation, 'id' | 'started_at' | 'last_message_at'>[]
  const typedMsgs = (messagesReal ?? []) as Pick<Message, 'id' | 'conversation_id' | 'role' | 'content' | 'created_at'>[]
  const typedLeads = (leads ?? []) as Pick<Lead, 'id' | 'created_at'>[]
  const typedSources = (sources ?? []) as Pick<KnowledgeSource, 'id' | 'status'>[]

  // --- Aggregations ---

  const convsByDay = countByDate(typedConvs, (c) => c.started_at, dates30)
  const msgsByDay = countByDate(typedMsgs, (m) => m.created_at, dates30)
  const leadsByDay = countByDate(typedLeads, (l) => l.created_at, dates30)

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

  // KB source readiness breakdown
  const sourceStatusCounts: Record<string, number> = { ready: 0, processing: 0, pending: 0, error: 0 }
  for (const s of typedSources) {
    sourceStatusCounts[s.status] = (sourceStatusCounts[s.status] ?? 0) + 1
  }
  const kbData = Object.entries(sourceStatusCounts)
    .map(([status, count]) => ({ status, count }))
    .filter((d) => d.count > 0)

  // Fallback rate: % of assistant messages whose content matches fallbackMessage
  const fallbackMsg = bot.config.fallbackMessage?.trim() ?? ''
  const assistantMsgs = typedMsgs.filter((m) => m.role === 'assistant')
  const fallbackCount = fallbackMsg
    ? assistantMsgs.filter((m) => m.content.trim() === fallbackMsg).length
    : 0
  const fallbackRate =
    assistantMsgs.length > 0
      ? Math.round((fallbackCount / assistantMsgs.length) * 100)
      : 0

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Analytics</h2>
        <p className="text-sm text-muted-foreground">Last 30 days</p>
      </div>

      {/* Scalar stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Conversations"
          value={typedConvs.length}
          sub="last 30 days"
        />
        <StatCard
          label="Messages"
          value={typedMsgs.length}
          sub="last 30 days"
        />
        <StatCard
          label="Leads"
          value={typedLeads.length}
          sub="last 30 days"
        />
        <StatCard
          label="Fallback Rate"
          value={`${fallbackRate}%`}
          sub={`${fallbackCount} of ${assistantMsgs.length} replies`}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold">Conversations over time</h3>
          <ConversationsChart data={convsByDay} />
        </div>

        <div className="border rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold">Message volume</h3>
          <MessageVolumeChart data={msgsByDay} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-5 space-y-3 lg:col-span-2">
          <h3 className="text-sm font-semibold">Top visitor questions</h3>
          <TopQuestionsChart data={topQuestions} />
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold">Leads captured</h3>
            <LeadsChart data={leadsByDay} />
          </div>

          <div className="border rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold">Knowledge base</h3>
            <KbReadinessChart data={kbData} />
          </div>
        </div>
      </div>
    </div>
  )
}
