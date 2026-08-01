import 'server-only'
import { createServerClient } from '@/lib/supabase/server'
import {
  buildDemandRadarSnapshot,
  type DemandRadarConversation,
  type DemandRadarMessage,
  type DemandRadarSnapshot,
} from '@/lib/demand-radar'

const CONVERSATION_LIMIT = 1000
const MESSAGE_BATCH_SIZE = 150

/**
 * RLS-scoped read model for the per-bot Demand Radar screen. It deliberately
 * returns a small DTO: no visitor metadata, citations, tokens, or full bot
 * configuration cross the Server → Client boundary.
 */
export async function loadDemandRadar({
  botId,
  rangeDays,
  now,
}: {
  botId: string
  rangeDays: number
  now: Date
}): Promise<{ bot: { id: string; name: string } | null; snapshot: DemandRadarSnapshot }> {
  const supabase = await createServerClient()
  const { data: bot } = await supabase
    .from('bots')
    .select('id, name')
    .eq('id', botId)
    .single<{ id: string; name: string }>()

  const emptySnapshot = buildDemandRadarSnapshot({ conversations: [], messages: [], rangeDays, now })
  if (!bot) return { bot: null, snapshot: emptySnapshot }

  const since = new Date(now)
  since.setUTCDate(since.getUTCDate() - (rangeDays - 1))

  const { data: conversationRows } = await supabase
    .from('conversations')
    .select('id, visitor_id, started_at, channel, topics, had_fallback, success_score')
    .eq('bot_id', botId)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: false })
    .limit(CONVERSATION_LIMIT)

  const conversations = (conversationRows ?? []) as DemandRadarConversation[]
  const conversationIds = conversations.map((conversation) => conversation.id)
  const batchStarts = Array.from(
    { length: Math.ceil(conversationIds.length / MESSAGE_BATCH_SIZE) },
    (_, index) => index * MESSAGE_BATCH_SIZE,
  )
  const messageBatches = await Promise.all(
    batchStarts.map(async (start): Promise<DemandRadarMessage[]> => {
      const batchIds = conversationIds.slice(start, start + MESSAGE_BATCH_SIZE)
      const { data } = await supabase
        .from('messages')
        .select('conversation_id, role, content, created_at, feedback, products')
        .in('conversation_id', batchIds)
        .order('created_at', { ascending: true })
      return (data ?? []) as DemandRadarMessage[]
    }),
  )

  return {
    bot,
    snapshot: buildDemandRadarSnapshot({
      conversations,
      messages: messageBatches.flat(),
      rangeDays,
      now,
    }),
  }
}
