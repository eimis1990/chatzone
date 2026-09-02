import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import { AnalyticsSection, ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'
import type { Bot } from '@/lib/types'

/**
 * Owner-side Analytics for a client's bot: the exact view the client sees on
 * their per-bot Analytics tab, so the owner can check usage, leads, and
 * after-hours share before a renewal call without switching accounts.
 * Aggregates only — no transcripts here.
 */
export default async function OwnerBotAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string; botId: string }>
  searchParams: Promise<{ range?: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params
  const { range: rangeParam } = await searchParams
  const rangeDays = ALLOWED_RANGES.includes(Number(rangeParam)) ? Number(rangeParam) : 30

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config' | 'org_id'>>()
  if (!bot || bot.org_id !== orgId) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OwnerBotTabs orgId={orgId} botId={botId} />
      <div className="min-h-0 flex-1 overflow-auto">
        <AnalyticsSection bot={bot} rangeDays={rangeDays} />
      </div>
    </div>
  )
}
