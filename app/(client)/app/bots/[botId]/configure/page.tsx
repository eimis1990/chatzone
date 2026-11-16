import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/client/ConfigForm'
import { getOrganizationPolicy } from '@/lib/organization-policy-server'
import type { Bot, Plan } from '@/lib/types'

export default async function ConfigurePage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()
  const { data } = await supabase
    .from('bots')
    .select('id, name, config, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'config' | 'org_id'>>()

  if (!data) notFound()

  // Plan entitlements + the Voice add-on gate which controls are editable.
  const { data: org } = await supabase
    .from('organizations')
    .select('plan, voice_addon, visualizer_addon')
    .eq('id', data.org_id)
    .single<{ plan: Plan | null; voice_addon: boolean | null; visualizer_addon: boolean | null }>()
  const { entitlements: ent } = await getOrganizationPolicy(supabase, data.org_id)

  return (
    <ConfigForm
      botId={data.id}
      botName={data.name}
      initialConfig={data.config}
      maxLanguages={ent.maxLanguages}
      canUseLeadCapture={ent.leadCapture}
      canUseHandoff={ent.handoff}
      canRemoveBadge={ent.removeBadge}
      canUseProducts={ent.productSearch}
      canUseOrders={ent.orderLookup}
      canUseDictation={ent.dictation}
      canUseVoice={Boolean(org?.voice_addon)}
      canUseVisualizer={Boolean(org?.visualizer_addon)}
      voiceLocked={(org?.plan ?? 'free') === 'free'}
      audience="client"
    />
  )
}
