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

// Below this top-similarity, matches are usually incidental noise (an elliptical
// follow-up like "o kur ji yra?" pulling privacy-policy chunks) — worth one
// rewritten-query retry. Distinct from isWeak: 0.28 is a RETRY trigger, not a
// fallback trigger; genuinely-relevant reworded questions score ~0.3+.
export const LOW_CONFIDENCE_SIMILARITY = 0.28

export interface RetrievalResult {
  chunks: ContextChunk[]
  matched: MatchedChunk[]
  /** No matches at all — the fallback-message trigger. */
  isWeak: boolean
  /** Empty OR nothing scored convincingly — the query-rewrite-retry trigger. */
  isLowConfidence: boolean
  /** Best cosine similarity among matches (0 when empty) — for latency/quality logs. */
  topSimilarity: number
  /** Wall-clock split of the two network hops, for the `[chat] timing` log. */
  timings: { embedMs: number; matchMs: number }
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

  const t0 = performance.now()
  const embedding = await deps.embedQuery(query)
  const t1 = performance.now()
  const matched = await deps.matchChunks(botId, embedding, query, k, minSimilarity)
  const t2 = performance.now()

  const topSimilarity = matched.reduce((max, m) => Math.max(max, m.similarity ?? 0), 0)
  return {
    matched,
    chunks: matched.map((m) => ({ content: m.content, source_id: m.source_id })),
    isWeak: matched.length === 0,
    isLowConfidence: matched.length === 0 || topSimilarity < LOW_CONFIDENCE_SIMILARITY,
    topSimilarity,
    timings: { embedMs: Math.round(t1 - t0), matchMs: Math.round(t2 - t1) },
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
