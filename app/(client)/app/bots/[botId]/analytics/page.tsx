import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { AnalyticsSection, ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'
import type { Bot } from '@/lib/types'

export default async function AnalyticsPage({
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

  // Verify bot access via RLS
  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name, config')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config'>>()

  if (!bot) notFound()

  return <AnalyticsSection bot={bot} rangeDays={rangeDays} />
}
