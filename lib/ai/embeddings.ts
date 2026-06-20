import { embedMany } from 'ai'
import { openai } from '@ai-sdk/openai'

export const EMBEDDING_MODEL = 'text-embedding-3-small'

/**
 * Embeds a batch of texts into 1536-dim vectors using OpenAI
 * text-embedding-3-small. `embedMany` handles request batching internally.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const { embeddings } = await embedMany({
    model: openai.embedding(EMBEDDING_MODEL),
    values: texts,
  })
  return embeddings
}

/** Convenience single-text embedding. */
export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text])
  return vec
}
