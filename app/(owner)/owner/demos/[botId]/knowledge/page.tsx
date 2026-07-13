import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreateDemoOrg } from '@/lib/demo-org'
import { KnowledgeManager } from '@/components/client/knowledge/KnowledgeManager'
import { OwnerBotTabs } from '@/components/owner/OwnerBotTabs'
import type { Bot, KnowledgeSource } from '@/lib/types'

/** Demo-bot knowledge — crawl the prospect's site, upload docs, add Q&A. */
export default async function DemoKnowledgePage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('owner')
  const { botId } = await params

  const org = await getOrCreateDemoOrg()
  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'org_id'>>()
  if (!bot || bot.org_id !== org.id) notFound()

  const { data: sources } = await svc
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .returns<KnowledgeSource[]>()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <OwnerBotTabs orgId={org.id} botId={botId} base={`/owner/demos/${botId}`} />
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden p-6">
        <div className="flex-shrink-0">
          <h2 className="text-lg font-semibold">Knowledge base</h2>
          <p className="text-sm text-muted-foreground">
            Train this demo — usually by crawling the prospect&rsquo;s site.
          </p>
        </div>
        <KnowledgeManager botId={botId} initialSources={sources ?? []} audience="owner" />
      </div>
    </div>
  )
}
