import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import type { Bot } from '@/lib/types'
import { BotSidebar } from './BotSidebar'

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
    .select('id, name, status, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'status' | 'org_id'>>()

  if (!data) notFound()

  // Break out of the parent <main> padding (p-6) and fill the viewport below
  // the app header (h-14 = 3.5rem): sidebar + content canvas.
  return (
    <div className="-m-6 flex h-[calc(100svh-3.5rem)] overflow-hidden">
      <BotSidebar botId={botId} name={data.name} status={data.status} />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  )
}
