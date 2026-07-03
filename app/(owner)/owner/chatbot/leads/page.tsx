import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { LeadsSection } from '@/components/bot-views/LeadsSection'

export const metadata = { title: 'Chatbot leads — Owner | Loqara' }

/** Leads tab — contacts captured by Loqara's own landing-page bot. */
export default async function OwnerChatbotLeadsPage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  return <LeadsSection bot={bot} />
}
