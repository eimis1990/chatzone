import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { ConfigForm } from '@/components/client/ConfigForm'
import { entitlementsFor } from '@/lib/entitlements'
import { saveClientBotConfig } from './actions'
import type { Bot, Plan } from '@/lib/types'

/**
 * Owner-side bot configurator — lets the platform owner set up a client's bot look
 * (done-for-you). Reuses the client ConfigForm but loads/saves via the service
 * client through `saveClientBotConfig`.
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
    .select('name, plan, voice_addon')
    .eq('id', orgId)
    .single<{ name: string; plan: Plan | null; voice_addon: boolean | null }>()
  const ent = entitlementsFor(org?.plan ?? 'free')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        <span>
          Editing <strong>{bot.name}</strong> for <strong>{org?.name ?? 'client'}</strong> as the
          platform owner — changes go live on save.
        </span>
        <Link href={`/owner/clients/${orgId}`} className="font-medium underline">
          ← Back to client
        </Link>
      </div>
      <ConfigForm
        botId={bot.id}
        botName={bot.name}
        initialConfig={bot.config}
        canUseAllLanguages={ent.allLanguages}
        canUseLeadCapture={ent.leadCapture}
        canUseVoice={Boolean(org?.voice_addon)}
        onSave={saveClientBotConfig}
      />
    </div>
  )
}
