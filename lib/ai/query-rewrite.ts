import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { ChatMessage } from '@/lib/ai/prompt'

/**
 * One cheap rescue pass before serving the "I don't know" fallback: condense the
 * visitor's message (+ recent turns for pronouns/ellipsis) into a standalone,
 * keyword-rich retrieval query in the SAME language. Returns null when the
 * rewrite adds nothing — the caller then proceeds with the normal fallback.
 */
export async function rewriteQuery(
  message: string,
  history: ChatMessage[],
  generate: (prompt: string) => Promise<string> = defaultGenerate,
): Promise<string | null> {
  const recent = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n')
  const prompt =
    'Rewrite the final user message as a short, standalone search query for a help-center ' +
    'knowledge base. Resolve pronouns/references using the conversation. Keep the SAME language ' +
    'as the user. Output ONLY the query text (3-10 words), nothing else.\n\n' +
    (recent ? `Conversation:\n${recent}\n\n` : '') +
    `Final user message: ${message}`
  try {
    const out = (await generate(prompt)).trim().replace(/^["']|["']$/g, '')
    if (!out || out.toLowerCase() === message.trim().toLowerCase()) return null
    return out
  } catch {
    return null
  }
}

async function defaultGenerate(prompt: string): Promise<string> {
  // Side-task model: cheap, fast — quality of the rewrite matters less than latency.
  const { text } = await generateText({ model: openai('gpt-4o-mini'), temperature: 0, prompt })
  return text
}
