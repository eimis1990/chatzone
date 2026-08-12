import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { DemoPresentationStage } from '@/components/demo/DemoPresentationStage'

// Owner-only pitch stage — auth redirects anonymous requests, and this keeps
// the route out of indexes if it is ever reachable.
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createServiceClient } from '@/lib/supabase/service'
import type { Bot } from '@/lib/types'

/**
 * Full-screen presentation stage for a demo bot: the client's own store as the
 * backdrop with the real widget floating over it — reads as "the bot is
 * already installed on your site". Live iframe when the store allows framing;
 * most stores send X-Frame-Options, so the usual backdrop is a screenshot.
 * No store (or nothing renderable) → the original clean dotted stage.
 * Owner-only; lives outside the owner shell so there is no sidebar.
 */
export default async function PresentPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('owner')
  const { botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, public_key, config, org_id, organizations!inner(is_demo, is_platform)')
    .eq('id', botId)
    .eq('organizations.is_demo', true)
    .single<Pick<Bot, 'id' | 'name' | 'public_key' | 'config'>>()
  if (!bot) notFound()

  return (
    <DemoPresentationStage
      name={bot.name}
      publicKey={bot.public_key}
      storeUrl={bot.config.websiteUrl || bot.config.commerce?.storeUrl}
    />
  )
}
