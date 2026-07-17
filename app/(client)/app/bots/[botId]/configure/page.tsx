import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { ConfigForm } from '@/components/client/ConfigForm'
import { entitlementsFor } from '@/lib/entitlements'
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
    .select('plan, voice_addon')
    .eq('id', data.org_id)
    .single<{ plan: Plan | null; voice_addon: boolean | null }>()
  const ent = entitlementsFor(org?.plan ?? 'free')

  return (
    <ConfigForm
      botId={data.id}
      botName={data.name}
      initialConfig={data.config}
      maxLanguages={ent.maxLanguages}
      canUseLeadCapture={ent.leadCapture}
      canUseDictation={ent.dictation}
      canUseVoice={Boolean(org?.voice_addon)}
      voiceLocked={(org?.plan ?? 'free') === 'free'}
      audience="client"
    />
  )
}
