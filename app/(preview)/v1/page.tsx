import type { Metadata } from 'next'
import { StudioLanding } from '@/components/preview/v1/StudioLanding'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'
import { getLandingBot } from '@/lib/platform-bot'

export const metadata: Metadata = {
  title: 'Landing candidate 1 — Studio',
}

export const revalidate = 300

export default async function V1Page() {
  // The real platform bot, same as the live landing — the proof on this page is
  // the actual widget, not a mock of it.
  const bot = await getLandingBot()
  return (
    <>
      <StudioLanding />
      {bot && <WidgetEmbed botKey={bot.key} loadingPolicy="idle" launcher={bot.launcher} />}
    </>
  )
}
