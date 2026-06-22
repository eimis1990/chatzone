import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export interface ConversationAnalysis {
  summary: string
  topics: string[]
}

const analysisSchema = z.object({
  summary: z.string().describe('One or two sentences summarizing what the visitor wanted and the outcome.'),
  topics: z.array(z.string()).max(5).describe('Up to 5 short lowercase topic tags (1-2 words each).'),
})

/**
 * LLM summary + topic tags for a conversation transcript. Pure — the caller
 * persists the result. Returns empty values on failure (non-critical feature).
 */
export async function analyzeConversation(
  turns: { role: string; content: string }[],
): Promise<ConversationAnalysis> {
  const transcript = turns
    .filter((t) => t.role !== 'system' && t.content?.trim())
    .map((t) => `${t.role === 'user' ? 'Visitor' : 'Bot'}: ${t.content}`)
    .join('\n')
    .slice(0, 6000)

  if (!transcript) return { summary: '', topics: [] }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: analysisSchema,
      prompt:
        'Analyze this customer-support chat transcript. Write a concise 1-2 sentence summary ' +
        '(what the visitor wanted + the outcome) and extract up to 5 short topic tags.\n\n' +
        transcript,
    })
    return { summary: object.summary, topics: object.topics.slice(0, 5) }
  } catch {
    return { summary: '', topics: [] }
  }
}
