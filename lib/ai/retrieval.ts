import type { SupabaseClient } from '@supabase/supabase-js'
import { embedOne } from '@/lib/ai/embeddings'
import type { ContextChunk } from '@/lib/ai/prompt'
import type { MatchedChunk } from '@/lib/types'

export const DEFAULT_K = 5
export const DEFAULT_MIN_SIMILARITY = 0.3

export interface RetrievalOptions {
  k?: number
  minSimilarity?: number
}

export interface RetrievalDeps {
  embedQuery: (query: string) => Promise<number[]>
  matchChunks: (
    botId: string,
    embedding: number[],
    k: number,
    minSimilarity: number,
  ) => Promise<MatchedChunk[]>
}

export interface RetrievalResult {
  chunks: ContextChunk[]
  matched: MatchedChunk[]
  isWeak: boolean
}

/** Embeds the query and fetches the most similar chunks for a bot. */
export async function retrieveContext(
  botId: string,
  query: string,
  opts: RetrievalOptions = {},
  deps: RetrievalDeps,
): Promise<RetrievalResult> {
  const k = opts.k ?? DEFAULT_K
  const minSimilarity = opts.minSimilarity ?? DEFAULT_MIN_SIMILARITY

  const embedding = await deps.embedQuery(query)
  const matched = await deps.matchChunks(botId, embedding, k, minSimilarity)

  return {
    matched,
    chunks: matched.map((m) => ({ content: m.content, source_id: m.source_id })),
    isWeak: matched.length === 0,
  }
}

/** Build a deps object backed by a service-role client + OpenAI embeddings. */
export function serviceRetrievalDeps(db: SupabaseClient): RetrievalDeps {
  return {
    embedQuery: embedOne,
    async matchChunks(botId, embedding, k, minSimilarity) {
      const { data, error } = await db.rpc('match_chunks', {
        p_bot_id: botId,
        p_query_embedding: embedding,
        p_match_count: k,
        p_min_similarity: minSimilarity,
      })
      if (error) throw new Error(`match_chunks failed: ${error.message}`)
      return (data ?? []) as MatchedChunk[]
    },
  }
}
