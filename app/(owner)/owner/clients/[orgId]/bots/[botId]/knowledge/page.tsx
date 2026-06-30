import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { KnowledgeManager } from '@/components/client/knowledge/KnowledgeManager'
import type { Bot, KnowledgeSource } from '@/lib/types'

/**
 * Owner-side Knowledge for a client's bot (done-for-you): upload docs, paste
 * text, add Q&A, or crawl the client's site. Reuses the client KnowledgeManager;
 * the owner's service/RLS access lets it manage any bot's sources.
 */
export default async function OwnerBotKnowledgePage({
  params,
}: {
  params: Promise<{ orgId: string; botId: string }>
}) {
  await requireRole('owner')
  const { orgId, botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, org_id')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'org_id'>>()
  if (!bot || bot.org_id !== orgId) notFound()

  const { data: sources } = await svc
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .returns<KnowledgeSource[]>()

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden p-6">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold">Knowledge base</h2>
        <p className="text-sm text-muted-foreground">
          Train this client&rsquo;s bot — upload docs, paste text, add Q&amp;A, or crawl their site.
          Each source is parsed, chunked and embedded automatically.
        </p>
      </div>
      <KnowledgeManager botId={botId} initialSources={sources ?? []} />
    </div>
  )
}
