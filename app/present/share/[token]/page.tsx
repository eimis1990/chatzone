import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DemoPresentationStage } from '@/components/demo/DemoPresentationStage'
import { hashDemoShareToken, isDemoShareToken } from '@/lib/demo-share-token'
import { createServiceClient } from '@/lib/supabase/service'
import type { Bot } from '@/lib/types'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

/** Public bearer-link presentation. Every request rechecks expiry and demo membership. */
export default async function SharedDemoPresentationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!isDemoShareToken(token)) notFound()

  const svc = createServiceClient()
  const now = new Date().toISOString()
  const { data: share } = await svc
    .from('demo_presentation_shares')
    .select('bot_id')
    .eq('token_hash', hashDemoShareToken(token))
    .is('revoked_at', null)
    .gt('expires_at', now)
    .maybeSingle<{ bot_id: string }>()
  if (!share) notFound()

  // This second, current-state check is the critical boundary: a valid token
  // stops working immediately if its bot is transferred out of the demo org.
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, public_key, config, organizations!inner(is_demo)')
    .eq('id', share.bot_id)
    .eq('organizations.is_demo', true)
    .maybeSingle<Pick<Bot, 'id' | 'name' | 'public_key' | 'config'>>()
  if (!bot) notFound()

  return (
    <DemoPresentationStage
      name={bot.name}
      publicKey={bot.public_key}
      storeUrl={bot.config.websiteUrl || bot.config.commerce?.storeUrl}
    />
  )
}
