import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { DemandRadarView } from '@/components/bot-views/DemandRadarView'
import { createDemandActionPlan } from '@/lib/actions/demand-radar'
import { loadDemandRadar } from '@/lib/data/demand-radar'

const ALLOWED_RANGES = [7, 30, 90]

export default async function DemandRadarPage({
  params,
  searchParams,
}: {
  params: Promise<{ botId: string }>
  searchParams: Promise<{ range?: string }>
}) {
  await requireRole('client')
  const { botId } = await params
  const { range: rangeParam } = await searchParams
  const rangeDays = ALLOWED_RANGES.includes(Number(rangeParam)) ? Number(rangeParam) : 30
  const now = new Date()
  const { bot, snapshot } = await loadDemandRadar({ botId, rangeDays, now })

  if (!bot) notFound()

  const since = new Date(now)
  since.setDate(since.getDate() - (rangeDays - 1))
  const rangeLabel = `${since.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <DemandRadarView
      bot={bot}
      snapshot={snapshot}
      rangeDays={rangeDays}
      rangeLabel={rangeLabel}
      createActionPlanAction={createDemandActionPlan}
    />
  )
}
