import type { BotConfig } from '@/lib/types'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ContextChunk {
  content: string
  source_id: string
}

/** Number of prior turns kept in the prompt. */
export const HISTORY_WINDOW = 10

/**
 * Assembles the message list for a chat completion: a system message combining
 * the bot persona, retrieved context (with source tags), grounding rules, then
 * a bounded slice of conversation history, then the new user message.
 */
export function buildMessages(
  config: BotConfig,
  context: ContextChunk[],
  history: ChatMessage[],
  userMessage: string,
): ChatMessage[] {
  const contextBlock = context.length
    ? context.map((c) => `[source: ${c.source_id}]\n${c.content}`).join('\n\n')
    : '(no relevant context was found)'

  const system = [
    config.systemPrompt,
    `Tone: ${config.persona.tone}. Verbosity: ${config.persona.verbosity}.`,
    'Answer using ONLY the context below. Cite the sources you used by their id.',
    `If the answer is not contained in the context, do not invent one — reply with: "${config.fallbackMessage}"`,
    '\n--- CONTEXT ---\n' + contextBlock,
  ].join('\n\n')

  const trimmedHistory = history.slice(-HISTORY_WINDOW)

  return [
    { role: 'system', content: system },
    ...trimmedHistory,
    { role: 'user', content: userMessage },
  ]
}
