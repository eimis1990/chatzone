import type { Metadata } from 'next'
import { GlassLanding } from '@/components/preview/v2/GlassLanding'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'
import { getLandingBot } from '@/lib/platform-bot'

export const metadata: Metadata = {
  title: 'Landing candidate 2 — Glass wall',
}

export const revalidate = 300

export default async function V2Page() {
  const bot = await getLandingBot()
  return (
    <>
      <GlassLanding />
      {bot && <WidgetEmbed botKey={bot.key} loadingPolicy="idle" launcher={bot.launcher} />}
    </>
  )
}
