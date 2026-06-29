export interface Chunk {
  content: string
  index: number
}

export interface ChunkOptions {
  /** Target maximum tokens per chunk. */
  maxTokens?: number
  /** Tokens of trailing context carried into the next chunk (prose fallback). */
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

/** Structural blocks: split on blank lines; a Markdown heading starts a block. */
function splitBlocks(text: string): { text: string; isHeading: boolean }[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b) => ({ text: b, isHeading: /^#{1,6}\s/.test(b) }))
}

/**
 * Sentence-accumulating chunker for a single block of prose. Accumulates
 * sentences up to `maxTokens`, then starts a new chunk carrying up to `overlap`
 * tokens of trailing sentences for context continuity.
 */
function sentenceChunks(text: string, maxTokens: number, overlap: number): string[] {
  const sentences = splitSentences(text)
  const out: string[] = []
  let current: string[] = []
  let currentTokens = 0

  const flush = () => {
    if (current.length) out.push(current.join(' ').trim())
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
  return out
}

/**
 * Structure-aware chunker. Splits the text into blocks (paragraphs, with each
 * Markdown heading starting a fresh block) and packs blocks into ~maxTokens
 * chunks — but never merges across a heading, so a document's sections stay
 * together and embed with focused, section-specific meaning instead of one
 * diluted blob. A block larger than the budget falls back to sentence
 * splitting (with overlap). Defaults: ~300-token chunks.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): Chunk[] {
  const maxTokens = opts.maxTokens ?? 300
  const overlap = opts.overlap ?? Math.round(maxTokens * 0.15)

  const trimmed = text.trim()
  if (!trimmed) return []

  const chunks: Chunk[] = []
  let index = 0
  const push = (content: string) => {
    const c = content.trim()
    if (c) chunks.push({ content: c, index: index++ })
  }

  let current: string[] = []
  let currentTokens = 0
  const flush = () => {
    if (current.length) {
      push(current.join('\n\n'))
      current = []
      currentTokens = 0
    }
  }

  for (const block of splitBlocks(trimmed)) {
    const t = estimateTokens(block.text)

    // A heading begins a new section — don't let it trail the previous chunk.
    if (block.isHeading) flush()

    // A block larger than the budget is sentence-split into its own chunks.
    if (t > maxTokens) {
      flush()
      for (const sub of sentenceChunks(block.text, maxTokens, overlap)) push(sub)
      continue
    }

    if (currentTokens + t > maxTokens && current.length > 0) flush()
    current.push(block.text)
    currentTokens += t
  }
  flush()

  return chunks
}
