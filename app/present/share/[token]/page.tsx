import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DemoPresentationStage } from '@/components/demo/DemoPresentationStage'
import { getDemoBotByShareToken, presentSiteUrl } from '@/lib/demo/present-bot'
import { presentSiteProxyUrl } from '@/lib/demo/present-proxy'

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
  const bot = await getDemoBotByShareToken(token)
  if (!bot) notFound()

  return (
    <DemoPresentationStage
      name={bot.name}
      publicKey={bot.public_key}
      storeUrl={presentSiteUrl(bot)}
      siteProxyUrl={presentSiteProxyUrl({ token })}
    />
  )
}
