import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { assignedComponents } from '@/lib/widget-components/availability'
import { BotComponentsView } from '@/components/client/BotComponentsView'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import type { Bot } from '@/lib/types'

/** Owner twin of the client's Components page (done-for-you variant picking). */
export default async function OwnerBotComponentsPage({
  params,
}: {
  params: Promise<{ orgId: string; botId: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'config' | 'org_id'>>()
  if (!bot || bot.org_id !== orgId) notFound()

  const allowed = await assignedComponents(svc, bot.config.commerce?.provider ?? null)

  return (
    <div className="flex h-full flex-col">
      <OwnerBotTabs orgId={orgId} botId={botId} />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div>
          <h1 className="text-lg font-semibold">Components</h1>
          <p className="text-sm text-muted-foreground">
            Variant picking on the client&apos;s behalf — same controls the client sees.
          </p>
        </div>
        <BotComponentsView
          botId={bot.id}
          assignedKeys={[...allowed]}
          currentVariants={bot.config.components ?? {}}
        />
      </div>
    </div>
  )
}
