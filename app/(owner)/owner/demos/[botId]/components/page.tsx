import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { assignedComponentVariants } from '@/lib/widget-components/availability'
import { BotComponentsView } from '@/components/client/BotComponentsView'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import type { Bot } from '@/lib/types'

/** Components tab for a DEMO bot — same variant picking as the client twin,
 *  scoped under /owner/demos (the tab 404'd here before this page existed). */
export default async function DemoBotComponentsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('owner')
  const { botId } = await params

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'config' | 'org_id'>>()
  if (!bot || bot.org_id !== org.id) notFound()

  const allowed = await assignedComponentVariants(svc, bot.config.commerce?.provider ?? null)

  return (
    <div className="flex h-full flex-col">
      <OwnerBotTabs orgId={org.id} botId={botId} base={`/owner/demos/${botId}`} />
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">
        <div>
          <h1 className="text-lg font-semibold">Components</h1>
          <p className="text-sm text-muted-foreground">
            Pick which variant of each chat component this demo bot renders.
          </p>
        </div>
        <BotComponentsView
          botId={bot.id}
          available={Object.fromEntries([...allowed].map(([k, v]) => [k, [...v]]))}
          currentVariants={bot.config.components ?? {}}
        />
      </div>
    </div>
  )
}
