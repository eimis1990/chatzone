import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'

// Navigation now lives in the app-level sidebar (AppSidebar). This layout just
// guards access and confirms the bot exists; the content fills the main area
// (the Configure page is full-bleed panel + canvas, other pages scroll).
export default async function BotLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data } = await supabase.from('bots').select('id').eq('id', botId).single()
  if (!data) notFound()

  return <>{children}</>
}
