import type { SupabaseClient } from '@supabase/supabase-js'
import { embedOne } from '@/lib/ai/embeddings'
import type { ContextChunk } from '@/lib/ai/prompt'
import type { MatchedChunk } from '@/lib/types'

export const DEFAULT_K = 5
// Cosine-similarity floor for a chunk to count as relevant. text-embedding-3-small
// scores genuinely-relevant pairs ~0.3–0.6, but reworded questions often land in
// 0.2–0.3, so a 0.3 floor cold-rejected answers that WERE in the KB. The grounding
// prompt ("answer only from context, else say you're unsure") guards against using
// a weakly-related chunk, so we keep recall higher and let the model decide.
export const DEFAULT_MIN_SIMILARITY = 0.2

export interface RetrievalOptions {
  k?: number
  minSimilarity?: number
}

export interface RetrievalDeps {
  embedQuery: (query: string) => Promise<number[]>
  matchChunks: (
    botId: string,
    embedding: number[],
    queryText: string,
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
  const matched = await deps.matchChunks(botId, embedding, query, k, minSimilarity)

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
    async matchChunks(botId, embedding, queryText, k, minSimilarity) {
      // Hybrid: vector + full-text, fused with RRF (see migration 0020). Lexical
      // matches (emails, names, keywords) surface even when cosine is mediocre.
      const { data, error } = await db.rpc('match_chunks_hybrid', {
        p_bot_id: botId,
        p_query_embedding: embedding,
        p_query_text: queryText,
        p_match_count: k,
        p_min_similarity: minSimilarity,
      })
      if (error) throw new Error(`match_chunks_hybrid failed: ${error.message}`)
      return (data ?? []) as MatchedChunk[]
    },
  }
}
