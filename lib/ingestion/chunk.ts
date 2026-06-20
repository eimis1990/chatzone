export interface Chunk {
  content: string
  index: number
}

export interface ChunkOptions {
  /** Target maximum tokens per chunk. */
  maxTokens?: number
  /** Tokens of trailing context carried into the next chunk. */
  overlap?: number
}

const CHARS_PER_TOKEN = 4

/** Cheap, dependency-free token estimate (good enough for sizing chunks). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / CHARS_PER_TOKEN)
}

/** Split into sentences, keeping terminal punctuation attached. */
function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g)
  return (matches ?? []).map((s) => s.trim()).filter(Boolean)
}

/**
 * Sentence-aware chunker. Accumulates sentences up to `maxTokens`, then starts
 * a new chunk carrying up to `overlap` tokens of trailing sentences for
 * context continuity. Defaults: ~600 token chunks with ~15% overlap.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const maxTokens = opts.maxTokens ?? 600
  const overlap = opts.overlap ?? Math.round(maxTokens * 0.15)

  const trimmed = text.trim()
  if (!trimmed) return []

  const sentences = splitSentences(trimmed)
  const chunks: Chunk[] = []
  let current: string[] = []
  let currentTokens = 0
  let index = 0

  const flush = () => {
    if (current.length === 0) return
    chunks.push({ content: current.join(' ').trim(), index: index++ })
  }

  for (const sentence of sentences) {
    const t = estimateTokens(sentence)
    if (currentTokens + t > maxTokens && current.length > 0) {
      flush()
      // Carry trailing sentences (up to `overlap` tokens) into the next chunk.
      const carried: string[] = []
      let carriedTokens = 0
      for (let i = current.length - 1; i >= 0; i--) {
        const ct = estimateTokens(current[i])
        if (carriedTokens + ct > overlap) break
        carried.unshift(current[i])
        carriedTokens += ct
      }
      current = carried
      currentTokens = carriedTokens
    }
    current.push(sentence)
    currentTokens += t
  }
  flush()

  return chunks
}
