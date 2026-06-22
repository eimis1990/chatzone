import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

export interface ConversationAnalysis {
  summary: string
  topics: string[]
  /** 1 (poor) – 5 (excellent), or 0 when not evaluated. */
  successScore: number
  successReason: string
}

const analysisSchema = z.object({
  summary: z.string().describe('One or two sentences summarizing what the visitor wanted and the outcome.'),
  topics: z.array(z.string()).max(5).describe('Up to 5 short lowercase topic tags (1-2 words each).'),
  successScore: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe('How well the assistant handled the conversation: 1 = poor, 5 = excellent.'),
  successReason: z
    .string()
    .describe('One or two sentences explaining the score — what the assistant did well or poorly.'),
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

  if (!transcript) return { summary: '', topics: [], successScore: 0, successReason: '' }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: analysisSchema,
      prompt:
        'Analyze this customer-support chat transcript. Provide: (1) a concise 1-2 sentence ' +
        'summary (what the visitor wanted + the outcome); (2) up to 5 short topic tags; and ' +
        '(3) a success score from 1 (poor) to 5 (excellent) rating how well the assistant ' +
        'helped — consider relevance, accuracy, whether the visitor’s need was met, and tone — ' +
        'with a one or two sentence reason.\n\n' +
        transcript,
    })
    return {
      summary: object.summary,
      topics: object.topics.slice(0, 5),
      successScore: object.successScore,
      successReason: object.successReason,
    }
  } catch {
    return { summary: '', topics: [], successScore: 0, successReason: '' }
  }
}
