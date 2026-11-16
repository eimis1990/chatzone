import type { SupabaseClient } from '@supabase/supabase-js'
import type { Conversation } from '@/lib/types'

export const CONVERSATIONS_PAGE_SIZE = 50

export function conversationPage(value: unknown): number {
  const n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0 && n <= 1_000_000 ? n : 1
}

type ConversationSummary = Pick<Conversation,
  'id' | 'visitor_id' | 'started_at' | 'last_message_at' | 'summary' | 'topics' |
  'had_fallback' | 'success_score' | 'success_reason' | 'channel'
> & { messages: { count: number }[]; negative_messages: { count: number }[] }

/** RLS client only. Embedded counts avoid fetching/truncating thousands of messages,
 * and bounded pages keep visitor-block filters below the HTTP URL limit. */
export async function loadConversationPage(db: SupabaseClient, botId: string, page: number) {
  const currentPage = conversationPage(page)
  const offset = (currentPage - 1) * CONVERSATIONS_PAGE_SIZE
  const { data, error, count } = await db.from('conversations')
    .select('id, visitor_id, started_at, last_message_at, summary, topics, had_fallback, success_score, success_reason, channel, messages(count), negative_messages:messages(count)', { count: 'exact' })
    .eq('bot_id', botId)
    .eq('negative_messages.feedback', 'down')
    .order('last_message_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + CONVERSATIONS_PAGE_SIZE - 1)
  // Recover stale bookmarks after retention/deletion shrinks the history.
  if (!error && count !== null && currentPage > Math.max(1, Math.ceil(count / CONVERSATIONS_PAGE_SIZE))) {
    return loadConversationPage(db, botId, Math.max(1, Math.ceil(count / CONVERSATIONS_PAGE_SIZE)))
  }
  return { conversations: (data ?? []) as ConversationSummary[], error, total: count ?? 0, currentPage, pageSize: CONVERSATIONS_PAGE_SIZE }
}
