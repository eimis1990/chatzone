import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import type { KnowledgeSource } from '@/lib/types'
import { KnowledgeManager } from '@/components/client/knowledge/KnowledgeManager'

interface PageProps {
  params: Promise<{ botId: string }>
}

export default async function KnowledgePage({ params }: PageProps) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()

  // Verify the bot belongs to the user's org (RLS enforces this).
  const { data: bot } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .single()

  if (!bot) notFound()

  // Load initial sources; the client will poll for status updates.
  const { data: sources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .returns<KnowledgeSource[]>()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Knowledge Base</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add sources to train your bot. Each source is parsed, chunked, and embedded
          automatically.
        </p>
      </div>
      <KnowledgeManager botId={botId} initialSources={sources ?? []} />
    </div>
  )
}
