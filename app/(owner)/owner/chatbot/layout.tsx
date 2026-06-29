import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot, ensurePlatformMembership } from '@/lib/platform-bot'

/**
 * Loqara's own bot section. The Configure / Knowledge sub-nav lives in the owner
 * sidebar (under "Our chatbot"). This layout just bootstraps the platform bot
 * and makes the owner a member of the platform org so the knowledge flows work.
 */
export default async function OwnerChatbotLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  await ensurePlatformMembership(bot.org_id, user.id)

  return <div className="flex h-full min-h-0 flex-col">{children}</div>
}
