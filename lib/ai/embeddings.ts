import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'

// OpenAI caps embedding requests at 300k tokens. Product docs run ~200-400
// tokens each, so 500 per request stays far below the cap with headroom for
// outliers. (A 2647-doc catalog sent as one request hit the cap and failed.)
const BATCH_SIZE = 500

/**
 * Embeds a batch of texts into 1536-dim vectors using OpenAI
 * text-embedding-3-small, chunking into API-sized requests.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: texts.slice(i, i + BATCH_SIZE),
    })
    out.push(...embeddings)
  }
  return out
}

/** Convenience single-text embedding. */
export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text])
  return vec
}
