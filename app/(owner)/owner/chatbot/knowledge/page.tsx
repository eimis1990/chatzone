import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { getOrCreatePlatformBot } from '@/lib/platform-bot'
import { KnowledgeManager } from '@/components/client/knowledge/KnowledgeManager'
import type { KnowledgeSource } from '@/lib/types'

export const metadata = { title: 'Chatbot Knowledge — Owner | Loqara' }

/** Knowledge tab — upload sources for Loqara's own bot (reuses the client manager). */
export default async function OwnerChatbotKnowledgePage() {
  await requireRole('owner')
  const bot = await getOrCreatePlatformBot()

  const svc = createServiceClient()
  const { data: sources } = await svc
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', bot.id)
    .order('created_at', { ascending: false })
    .returns<KnowledgeSource[]>()

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden p-6">
      <div className="flex-shrink-0">
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground">
          Add sources to train Loqara&rsquo;s own bot. Each source is parsed, chunked, and embedded
          automatically. Tip: paste the knowledge doc as a <strong>Text</strong> source, or upload
          the <code>.md</code> file.
        </p>
      </div>
      <KnowledgeManager botId={bot.id} initialSources={sources ?? []} />
    </div>
  )
}
