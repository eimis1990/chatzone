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
/** Builds the grounding system prompt (persona + language + retrieved context). */
export function buildSystemPrompt(config: BotConfig, context: ContextChunk[]): string {
  const contextBlock = context.length
    ? context.map((c) => `[source: ${c.source_id}]\n${c.content}`).join('\n\n')
    : '(no relevant context was found)'
  const languageName = config.language === 'lt' ? 'Lithuanian' : 'English'

  return [
    config.systemPrompt,
    `Tone: ${config.persona.tone}. Verbosity: ${config.persona.verbosity}.`,
    `Always respond in ${languageName}, regardless of the language the user writes in.`,
    'Answer using ONLY the context below. Cite the sources you used by their id.',
    `If the answer is not contained in the context, do not invent one — reply with: "${config.fallbackMessage}"`,
    '\n--- CONTEXT ---\n' + contextBlock,
  ].join('\n\n')
}

export function buildMessages(
  config: BotConfig,
  context: ContextChunk[],
  history: ChatMessage[],
  userMessage: string,
): ChatMessage[] {
  const system = buildSystemPrompt(config, context)
  const trimmedHistory = history.slice(-HISTORY_WINDOW)

  return [
    { role: 'system', content: system },
    ...trimmedHistory,
    { role: 'user', content: userMessage },
  ]
}
