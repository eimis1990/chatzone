import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { AnalyticsSection, ALLOWED_RANGES } from '@/components/bot-views/AnalyticsSection'

export const metadata = { title: 'Chatbot analytics — Owner | Loqara' }

/** Analytics tab — how Loqara's own landing-page bot is performing. */
export default async function OwnerChatbotAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  const { range: rangeParam } = await searchParams
  const rangeDays = ALLOWED_RANGES.includes(Number(rangeParam)) ? Number(rangeParam) : 30
  return <AnalyticsSection bot={bot} rangeDays={rangeDays} />
}
