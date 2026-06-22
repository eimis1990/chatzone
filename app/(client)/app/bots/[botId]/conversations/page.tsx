import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TranscriptView } from '@/components/client/TranscriptView'
import { analyzeConversation } from '@/lib/ai/conversation-intel'
import type { Conversation, Message } from '@/lib/types'

interface ConversationRow
  extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
  summary: string | null
  topics: string[] | null
  needs_attention: boolean
  success_score: number | null
  success_reason: string | null
}

export interface ConversationAnalysisResult {
  summary: string
  topics: string[]
  successScore: number
  successReason: string
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

  // Fetch conversations with intelligence fields
  const { data: rawConvs } = await supabase
    .from('conversations')
    .select(
      'id, visitor_id, started_at, last_message_at, summary, topics, had_fallback, success_score, success_reason',
    )
    .eq('bot_id', botId)
    .order('last_message_at', { ascending: false })

  const conversations = (rawConvs ?? []) as Pick<
    Conversation,
    | 'id'
    | 'visitor_id'
    | 'started_at'
    | 'last_message_at'
    | 'summary'
    | 'topics'
    | 'had_fallback'
    | 'success_score'
    | 'success_reason'
  >[]

  // Message counts + which conversations got a thumbs-down, in two queries.
  const ids = conversations.map((c) => c.id)

  const countMap: Record<string, number> = {}
  const negative = new Set<string>()

  if (ids.length > 0) {
    const { data: counts } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids)
    for (const row of counts ?? []) {
      const cid = (row as { conversation_id: string }).conversation_id
      countMap[cid] = (countMap[cid] ?? 0) + 1
    }

    const { data: downs } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', ids)
      .eq('feedback', 'down')
    for (const row of downs ?? []) {
      negative.add((row as { conversation_id: string }).conversation_id)
    }
  }

  const rows: ConversationRow[] = conversations.map((c) => ({
    id: c.id,
    visitor_id: c.visitor_id,
    started_at: c.started_at,
    last_message_at: c.last_message_at,
    message_count: countMap[c.id] ?? 0,
    summary: c.summary ?? null,
    topics: c.topics ?? null,
    needs_attention: Boolean(c.had_fallback) || negative.has(c.id),
    success_score: c.success_score ?? null,
    success_reason: c.success_reason ?? null,
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
      .select('id, conversation_id, role, content, citations, token_count, created_at, feedback')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    return (data ?? []) as Message[]
  }

  /**
   * Server Action — returns the cached AI summary/topics for a conversation,
   * generating + caching them on first view. Ownership is enforced by RLS on the
   * read; the cache write uses the service client (no UPDATE policy needed).
   */
  async function analyze(conversationId: string): Promise<ConversationAnalysisResult> {
    'use server'
    const empty = { summary: '', topics: [], successScore: 0, successReason: '' }
    const sb = await createServerClient()
    const { data: conv } = await sb
      .from('conversations')
      .select('id, summary, topics, analyzed_at, success_score, success_reason')
      .eq('id', conversationId)
      .single<
        Pick<Conversation, 'id' | 'summary' | 'topics' | 'analyzed_at' | 'success_score' | 'success_reason'>
      >()
    if (!conv) return empty // not owned/visible
    if (conv.analyzed_at && conv.summary) {
      return {
        summary: conv.summary,
        topics: conv.topics ?? [],
        successScore: conv.success_score ?? 0,
        successReason: conv.success_reason ?? '',
      }
    }

    const { data: msgs } = await sb
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (!msgs || msgs.length < 2) return empty

    const result = await analyzeConversation(msgs as { role: string; content: string }[])
    if (result.summary) {
      const svc = createServiceClient()
      await svc
        .from('conversations')
        .update({
          summary: result.summary,
          topics: result.topics,
          success_score: result.successScore || null,
          success_reason: result.successReason || null,
          analyzed_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
    }
    return result
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Conversations</h2>
        <p className="text-sm text-muted-foreground">
          Browse chat transcripts and visitor interactions
        </p>
      </div>

      <TranscriptView conversations={rows} loadMessages={loadMessages} analyze={analyze} />
    </div>
  )
}
