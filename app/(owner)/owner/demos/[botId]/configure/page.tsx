import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { ConfigForm } from '@/components/client/ConfigForm'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import { entitlementsFor } from '@/lib/entitlements'
import { saveClientBotConfig } from '@/app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/actions'
import type { Bot } from '@/lib/types'

/** Demo-bot configurator — the done-for-you editor scoped under /owner/demos. */
export default async function DemoConfigurePage({
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
    .select('id, name, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config' | 'org_id'>>()
  if (!bot || bot.org_id !== org.id) notFound()

  // Demos org is enterprise + voice — every feature stays available.
  const ent = entitlementsFor('enterprise')

  return (
    <ConfigForm
      botId={bot.id}
      botName={bot.name}
      initialConfig={bot.config}
      maxLanguages={ent.maxLanguages}
      canUseLeadCapture={ent.leadCapture}
      canUseDictation={ent.dictation}
      canUseVoice
      onSave={saveClientBotConfig}
      topSlot={<OwnerBotTabs key="demo-bot-tabs" orgId={org.id} botId={botId} base={`/owner/demos/${botId}`} />}
    />
  )
}
