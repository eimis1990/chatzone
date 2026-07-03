import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ConversationsSection } from '@/components/bot-views/ConversationsSection'

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  // Verify bot belongs to this user's org (RLS handles it; notFound if no row)
  const supabase = await createServerClient()
  const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!bot) notFound()

  return <ConversationsSection botId={botId} />
}
