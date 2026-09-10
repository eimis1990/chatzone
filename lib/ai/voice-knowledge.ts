import type { ContextChunk } from '@/lib/ai/prompt'

/** Preserve the full top-k evidence: truncating a joined prefix can hide the answer
 * behind an unrelated first match. Retrieval already bounds the number of chunks.
 * Keep preview and public calls on the same evidence as text chat.
 */
export function voiceKnowledgeAnswer(chunks: ContextChunk[]): string {
  return chunks.map((chunk) => chunk.content).join('\n\n')
}
