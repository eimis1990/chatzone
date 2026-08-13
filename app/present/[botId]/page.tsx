import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { DemoPresentationStage } from '@/components/demo/DemoPresentationStage'

// Owner-only pitch stage — auth redirects anonymous requests, and this keeps
// the route out of indexes if it is ever reachable.
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { getDemoBot, presentSiteUrl } from '@/lib/demo/present-bot'
import { presentSiteProxyUrl } from '@/lib/demo/present-proxy'

/**
 * Full-screen presentation stage for a demo bot: the client's own store as the
 * backdrop with the real widget floating over it — reads as "the bot is
 * already installed on your site". The backdrop is the live site, re-served
 * through `/api/present/site` so it scrolls even though nearly every client
 * site forbids framing; a site our server cannot reach falls back to a
 * screenshot, and no site at all to the original clean dotted stage.
 * Owner-only; lives outside the owner shell so there is no sidebar.
 */
export default async function PresentPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('owner')
  const { botId } = await params

  const bot = await getDemoBot(botId)
  if (!bot) notFound()

  return (
    <DemoPresentationStage
      name={bot.name}
      publicKey={bot.public_key}
      storeUrl={presentSiteUrl(bot)}
      siteProxyUrl={presentSiteProxyUrl({ bot: bot.id })}
    />
  )
}
