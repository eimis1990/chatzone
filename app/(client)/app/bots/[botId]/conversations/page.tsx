import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { TranscriptView } from '@/components/client/TranscriptView'
import type { Conversation, Message } from '@/lib/types'

interface ConversationRow extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
}

export default async function ConversationsPage({
  params,
}: {
  params: Promise<{ botId: string }>
}) {
  await requireRole('client')
  const { botId } = await params

  const supabase = await createServerClient()

  // Verify bot belongs to this user's org (RLS handles it; notFound if no row)
  const { data: bot } = await supabase
    .from('bots')
    .select('id')
    .eq('id', botId)
    .single()

  if (!bot) notFound()

  // Fetch conversations with message count
  const { data: rawConvs } = await supabase
    .from('conversations')
    .select('id, visitor_id, started_at, last_message_at')
    .eq('bot_id', botId)
    .order('last_message_at', { ascending: false })

  const conversations = (rawConvs ?? []) as Pick<
    Conversation,
    'id' | 'visitor_id' | 'started_at' | 'last_message_at'
  >[]

  // Fetch message counts per conversation in a single query
  const ids = conversations.map((c) => c.id)

  let countMap: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids)

    if (counts) {
      for (const row of counts) {
        const cid = (row as { conversation_id: string }).conversation_id
        countMap[cid] = (countMap[cid] ?? 0) + 1
      }
    }
  }

  const rows: ConversationRow[] = conversations.map((c) => ({
    ...c,
    message_count: countMap[c.id] ?? 0,
  }))

  /**
   * Server Action — fetches messages for a given conversation.
   * Called by the client TranscriptView when the user selects a conversation.
   */
  async function loadMessages(conversationId: string): Promise<Message[]> {
    'use server'
    const sb = await createServerClient()
    const { data } = await sb
      .from('messages')
      .select('id, conversation_id, role, content, citations, token_count, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    return (data ?? []) as Message[]
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Conversations</h2>
        <p className="text-sm text-muted-foreground">
          Browse chat transcripts and visitor interactions
        </p>
      </div>

      <TranscriptView conversations={rows} loadMessages={loadMessages} />
    </div>
  )
}
