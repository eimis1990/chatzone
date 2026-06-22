import { describe, it, expect } from 'vitest'
import { analyzeConversation } from '@/lib/ai/conversation-intel'

describe('analyzeConversation', () => {
  it('returns empty analysis for an empty transcript (no LLM call)', async () => {
    const result = await analyzeConversation([])
    expect(result).toEqual({ summary: '', topics: [] })
  })

  it('returns empty analysis when only system messages are present', async () => {
    const result = await analyzeConversation([{ role: 'system', content: 'You are a bot.' }])
    expect(result).toEqual({ summary: '', topics: [] })
  })
})
