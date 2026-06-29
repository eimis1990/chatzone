import { requireRole } from '@/lib/auth/guards'
import { ConfigForm } from '@/components/client/ConfigForm'
import { LandingToggle } from '@/components/owner/LandingToggle'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { saveClientBotConfig } from '@/app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/actions'

export const metadata = { title: 'Chatbot — Owner | Loqara' }

/**
 * Loqara's own bot — dogfooded on the marketing landing page. Reuses the exact
 * client ConfigForm; the only extra is the "Show on landing" toggle next to Save.
 */
export default async function OwnerChatbotPage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
        This is <strong>Loqara&rsquo;s own bot</strong>, dogfooded on our landing page. Configure it
        like any client bot, then flip <strong>Show on landing</strong> to publish it for visitors.
      </div>
      <div className="min-h-0 flex-1">
        <ConfigForm
          botId={bot.id}
          botName={bot.name}
          initialConfig={bot.config}
          canUseAllLanguages
          canUseLeadCapture
          canUseVoice
          onSave={saveClientBotConfig}
          headerAction={<LandingToggle botId={bot.id} initial={bot.show_on_landing} />}
        />
      </div>
    </div>
  )
}
