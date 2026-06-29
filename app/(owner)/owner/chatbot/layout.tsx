import { requireRole } from '@/lib/auth/guards'
import { getOrCreatePlatformBot, ensurePlatformMembership } from '@/lib/platform-bot'
import { ChatbotTabs } from '@/components/owner/ChatbotTabs'

/**
 * Loqara's own bot section, with a Configure / Knowledge sub-nav (like the
 * client app's per-bot submenu). Bootstraps the platform bot and makes the
 * owner a member of the platform org so the knowledge flows work.
 */
export default async function OwnerChatbotLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('owner')
  const bot = await getOrCreatePlatformBot()
  await ensurePlatformMembership(bot.org_id, user.id)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-card px-5 pt-4 pb-3">
        <h1 className="text-lg font-semibold leading-tight">Our chatbot</h1>
        <p className="text-sm text-muted-foreground">
          Loqara&rsquo;s own bot — configure it, add knowledge, and publish it on the landing page.
        </p>
        <div className="mt-3">
          <ChatbotTabs />
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
