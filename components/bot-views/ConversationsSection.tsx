import Link from 'next/link'
import { loadConversationPage } from '@/lib/conversations'
import { createServerClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { TranscriptView } from '@/components/client/TranscriptView'
import { analyzeConversation } from '@/lib/ai/conversation-intel'
import {
  extendActiveVisitorBlock,
  getActiveVisitorBlocks,
  unblockVisitor,
} from '@/lib/visitor-blocks'
import type {
  VisitorBlockManagementAction,
  VisitorBlockManagementResult,
} from '@/lib/visitor-block-shared'
import type { Conversation, ConversationChannel, Message } from '@/lib/types'

/**
 * Shared Conversations view — used by the client bot pages AND the owner's
 * platform-bot section. Callers are responsible for the role guard + resolving
 * the bot; all reads here go through the RLS server client, so data stays
 * scoped to orgs the caller is a member of (the owner is a member of the
 * platform org via ensurePlatformMembership).
 */

interface ConversationRow
  extends Pick<Conversation, 'id' | 'visitor_id' | 'started_at' | 'last_message_at'> {
  message_count: number
  summary: string | null
  topics: string[] | null
  needs_attention: boolean
  success_score: number | null
  success_reason: string | null
  channel: ConversationChannel
  block_expires_at: string | null
}

export interface ConversationAnalysisResult {
  summary: string
  topics: string[]
  successScore: number
  successReason: string
}

export async function ConversationsSection({ botId, page = 1 }: { botId: string; page?: number }) {
  const supabase = await createServerClient()
  const result = await loadConversationPage(supabase, botId, page)
  if (result.error) {
    console.error('[conversations] Failed to load conversations', result.error)
    return (
      <div role="alert" className="p-6">
        <p>Conversations could not be loaded. Please try again.</p>
        <Link href="?page=1" className="underline">Try again</Link>
      </div>
    )
  }
  const { conversations, total, currentPage, pageSize } = result
  // Block metadata is supplementary; an outage must not hide transcripts.
  const activeBlocks = await getActiveVisitorBlocks(
    createServiceClient(), botId, conversations.map((c) => c.visitor_id),
  ).catch((error) => {
    console.error('[conversations] Failed to load visitor blocks', error)
    return null
  })

  const rows: ConversationRow[] = conversations.map((c) => ({
    id: c.id,
    visitor_id: c.visitor_id,
    started_at: c.started_at,
    last_message_at: c.last_message_at,
    message_count: c.messages[0]?.count ?? 0,
    summary: c.summary ?? null,
    topics: c.topics ?? null,
    needs_attention: Boolean(c.had_fallback) || (c.negative_messages[0]?.count ?? 0) > 0,
    success_score: c.success_score ?? null,
    success_reason: c.success_reason ?? null,
    channel: c.channel ?? 'chat',
    block_expires_at: activeBlocks?.get(c.visitor_id)?.expiresAt ?? null,
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
      .select('id, conversation_id, role, content, citations, token_count, created_at, feedback, products')
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

  /**
   * Server Action — changes a block only after RLS proves that the current user
   * can read this exact conversation and it belongs to the current bot.
   */
  async function manageVisitorBlock(
    conversationId: string,
    action: VisitorBlockManagementAction,
  ): Promise<VisitorBlockManagementResult> {
    'use server'
    if (action !== 'unblock' && action !== 'extend') {
      throw new Error('Unsupported visitor block action')
    }

    const sb = await createServerClient()
    const { data: conversation } = await sb
      .from('conversations')
      .select('visitor_id')
      .eq('id', conversationId)
      .eq('bot_id', botId)
      .maybeSingle<{ visitor_id: string }>()
    if (!conversation) throw new Error('Conversation not found')

    const svc = createServiceClient()
    if (action === 'unblock') {
      await unblockVisitor(svc, botId, conversation.visitor_id)
      return { blocked: false, expiresAt: null }
    }

    const extended = await extendActiveVisitorBlock(svc, botId, conversation.visitor_id)
    return {
      blocked: Boolean(extended),
      expiresAt: extended?.expiresAt ?? null,
    }
  }

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden p-0 md:gap-4 md:p-6">
      {/* Header is desktop-only; on mobile the list is full-bleed under the
          back nav so it reads as an app screen, not a card. */}
      <div className="hidden flex-shrink-0 md:block">
        <h2 className="text-lg font-semibold">Conversations</h2>
        <p className="text-sm text-muted-foreground">
          Browse chat transcripts and visitor interactions
        </p>
      </div>

      {activeBlocks === null && (
        <p role="status" className="px-4 text-sm text-amber-700">Visitor block status is temporarily unavailable. Transcripts are still available.</p>
      )}
      {total > pageSize && (
        <nav aria-label="Conversation pages" className="flex shrink-0 items-center gap-4 px-4 text-sm md:px-0">
          {currentPage > 1 && <Link href={`?page=${currentPage - 1}`} className="underline">Newer</Link>}
          <span>Page {currentPage} of {Math.ceil(total / pageSize)} · {total} conversations</span>
          {currentPage * pageSize < total && <Link href={`?page=${currentPage + 1}`} className="underline">Older</Link>}
        </nav>
      )}
      <TranscriptView
        key={currentPage}
        conversations={rows}
        loadMessages={loadMessages}
        analyze={analyze}
        manageVisitorBlock={manageVisitorBlock}
      />
    </div>
  )
}
