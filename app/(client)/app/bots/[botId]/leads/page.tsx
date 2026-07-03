import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { LeadsSection } from '@/components/bot-views/LeadsSection'
import type { Bot } from '@/lib/types'

export default async function LeadsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  // RLS: bot must belong to user's org
  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name'>>()

  if (!bot) notFound()

  return <LeadsSection bot={bot} />
}
