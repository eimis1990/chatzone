import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { MobileBackHeader } from '@/components/client/MobileBackHeader'

// Navigation now lives in the app-level sidebar (AppSidebar). This layout just
// guards access and confirms the bot exists; the content fills the main area
// (the Configure page is full-bleed panel + canvas, other pages scroll).
// On mobile there is no sidebar, so a back header (md:hidden, so it adds no DOM
// height on desktop) is rendered above the content.
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
  const { data } = await supabase
    .from('bots')
    .select('id, name')
    .eq('id', botId)
    .single<{ id: string; name: string }>()
  if (!data) notFound()

  return (
    <>
      <MobileBackHeader label={data.name} />
      {children}
    </>
  )
}
