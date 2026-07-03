import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { ConversationsSection } from '@/components/bot-views/ConversationsSection'

export const metadata = { title: 'Chatbot conversations — Owner | Loqara' }

/** Conversations tab — transcripts of Loqara's own landing-page bot. */
export default async function OwnerChatbotConversationsPage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  return <ConversationsSection botId={bot.id} />
}
