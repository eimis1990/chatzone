import { requireRole } from '@/lib/auth/guards'
import { ConfigForm } from '@/components/client/ConfigForm'
import { LandingToggle } from '@/components/owner/LandingToggle'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { saveClientBotConfig } from '@/app/(owner)/owner/clients/[orgId]/bots/[botId]/configure/actions'

export const metadata = { title: 'Chatbot — Owner | Loqara' }

/** Configure tab — Loqara's own bot, reusing the exact client ConfigForm. */
export default async function OwnerChatbotConfigurePage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()

  return (
    <div className="min-h-0 flex-1">
      <ConfigForm
        botId={bot.id}
        botName={bot.name}
        initialConfig={bot.config}
        maxLanguages={Infinity}
        canUseLeadCapture
        canUseVoice
        onSave={saveClientBotConfig}
        headerAction={<LandingToggle botId={bot.id} initial={bot.show_on_landing} />}
      />
    </div>
  )
}
