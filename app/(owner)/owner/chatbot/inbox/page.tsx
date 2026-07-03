import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { InboxSection } from '@/components/bot-views/InboxSection'

export const metadata = { title: 'Chatbot inbox — Owner | Loqara' }

/** Inbox tab — live handoffs for Loqara's own landing-page bot. */
export default async function OwnerChatbotInboxPage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  return <InboxSection botId={bot.id} />
}
