import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { ConfigForm } from '@/components/client/ConfigForm'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import { entitlementsFor } from '@/lib/entitlements'
import { saveClientBotConfig } from './actions'
import type { Bot, Plan } from '@/lib/types'

/**
 * Owner-side bot configurator — lets the platform owner set up a client's bot look
 * (done-for-you). Reuses the client ConfigForm but loads/saves via the service
 * client through `saveClientBotConfig`. The "editing as owner" banner + the
 * Configure/Knowledge tabs live in the bot-editor layout.
 */
export default async function OwnerConfigurePage({
  params,
}: {
  params: Promise<{ orgId: string; botId: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params

  const service = createServiceClient()
  const { data: bot } = await service
    .from('bots')
    .select('id, name, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config' | 'org_id'>>()

  if (!bot || bot.org_id !== orgId) notFound()

  const { data: org } = await service
    .from('organizations')
    .select('plan, voice_addon')
    .eq('id', orgId)
    .single<{ plan: Plan | null; voice_addon: boolean | null }>()
  const ent = entitlementsFor(org?.plan ?? 'free')

  return (
    <ConfigForm
      botId={bot.id}
      botName={bot.name}
      initialConfig={bot.config}
      canUseAllLanguages={ent.allLanguages}
      canUseLeadCapture={ent.leadCapture}
      canUseVoice={Boolean(org?.voice_addon)}
      onSave={saveClientBotConfig}
      topSlot={<OwnerBotTabs orgId={orgId} botId={botId} />}
    />
  )
}
