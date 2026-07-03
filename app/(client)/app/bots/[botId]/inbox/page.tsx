import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { InboxSection } from '@/components/bot-views/InboxSection'

export default async function InboxPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('client')
  const { botId } = await params

  // Verify bot belongs to this user's org (RLS handles it; notFound if no row)
  const supabase = await createServerClient()
  const { data: bot } = await supabase.from('bots').select('id, name').eq('id', botId).single()
  if (!bot) notFound()

  return <InboxSection botId={botId} />
}
