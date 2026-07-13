import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import { EmbedSnippetPanel } from '@/components/client/embed/EmbedSnippetPanel'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import type { Bot } from '@/lib/types'

/** Demo-bot embed snippet — handy for dropping the demo on a scratch page. */
export default async function DemoEmbedPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('owner')
  const { botId } = await params

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, public_key, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'public_key' | 'org_id'>>()
  if (!bot || bot.org_id !== org.id) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const snippet = buildEmbedSnippet(appUrl, bot.public_key)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OwnerBotTabs orgId={org.id} botId={botId} base={`/owner/demos/${botId}`} />
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="max-w-3xl p-6">
          <EmbedSnippetPanel snippet={snippet} botId={bot.id} />
        </div>
      </div>
    </div>
  )
}
