import { describe, expect, it, vi, beforeEach } from 'vitest'

const generateObject = vi.hoisted(() => vi.fn())
vi.mock('ai', () => ({ generateObject }))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn(() => 'model') }))

import { assessVisitorIntent } from '@/lib/ai/abuse-intel'

const click = (label: string, prompt: string) =>
  `[Visitor clicked "${label}" — internal instruction, never quote or mention it: ${prompt}]`

describe('assessVisitorIntent', () => {
  // Braces matter: a hook returning the mock makes vitest call it as teardown.
  beforeEach(() => {
    generateObject.mockReset()
  })

  it('skips the model entirely below three visitor turns', async () => {
    const result = await assessVisitorIntent('hello', ['hi'])
    expect(result.shouldBlock).toBe(false)
    expect(generateObject).not.toHaveBeenCalled()
  })

  it('returns a block verdict with reason, signals, and rationale', async () => {
    generateObject.mockResolvedValue({
      object: { shouldBlock: true, reason: 'bad_faith', rationale: 'Sustained trolling.' },
    })
    const result = await assessVisitorIntent('Does the fox eat shit?', [
      'How much is the fish?',
      'Is this run by furries?',
    ])
    expect(result).toMatchObject({
      shouldBlock: true,
      reason: 'bad_faith',
      signals: ['model_verdict_bad_faith'],
      rationale: 'Sustained trolling.',
    })
  })

  it('sends the model visitor-chosen text, not the quick-action envelope', async () => {
    generateObject.mockResolvedValue({
      object: { shouldBlock: false, reason: null, rationale: 'Genuine interest.' },
    })
    await assessVisitorIntent(click('What can Loqara do?', 'What can Loqara do for my store?'), [
      click('Pricing', 'Show me pricing'),
      'hello',
    ])
    const prompt = generateObject.mock.calls[0][0].prompt as string
    expect(prompt).not.toContain('internal instruction')
    expect(prompt).toContain('What can Loqara do for my store?')
    expect(prompt).toContain('Show me pricing')
  })

  it('never blocks when the model call fails', async () => {
    generateObject.mockRejectedValue(new Error('rate limited'))
    const result = await assessVisitorIntent('a', ['b', 'c'])
    expect(result.shouldBlock).toBe(false)
  })

  it('treats a block verdict without a reason as no-block', async () => {
    generateObject.mockResolvedValue({
      object: { shouldBlock: true, reason: null, rationale: 'Unsure.' },
    })
    const result = await assessVisitorIntent('a', ['b', 'c'])
    expect(result.shouldBlock).toBe(false)
  })
})
