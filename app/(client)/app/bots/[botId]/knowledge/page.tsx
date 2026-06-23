import { notFound } from 'next/navigation'
import { DatabaseIcon } from 'lucide-react'
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
    <div className="flex h-full flex-col gap-6 overflow-hidden p-6">
      <div className="flex flex-shrink-0 items-start gap-3">
        <div className="flex size-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <DatabaseIcon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Knowledge Base</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Add sources to train your bot. Each source is parsed, chunked, and embedded
            automatically.
          </p>
        </div>
      </div>
      <KnowledgeManager botId={botId} initialSources={sources ?? []} />
    </div>
  )
}
