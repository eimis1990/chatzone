import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import type { Bot } from '@/lib/types'
import { BotTabNav } from './BotTabNav'

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Bot header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">{data.name}</h1>
        </div>
        <Badge
          variant={data.status === 'active' ? 'default' : 'secondary'}
          className="capitalize"
        >
          {data.status}
        </Badge>
      </div>

      {/* Tab navigation — client component for active-tab highlighting */}
      <BotTabNav botId={botId} />

      {/* Page content with clear separation from the tab strip */}
      <div className="pt-4">{children}</div>
    </div>
  )
}
