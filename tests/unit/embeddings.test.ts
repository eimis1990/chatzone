import { describe, it, expect, vi, beforeEach } from 'vitest'

const embedManyMock = vi.fn()
vi.mock('ai', () => ({ embedMany: (args: unknown) => embedManyMock(args) }))
vi.mock('@ai-sdk/openai', () => ({
  openai: { embedding: (m: string) => ({ model: m }) },
}))

import { embed, EMBEDDING_MODEL } from '@/lib/ai/embeddings'

describe('embed', () => {
  // Braces matter: mockReset() returns the mock, and a beforeEach that RETURNS
  // a function makes vitest call it as a cleanup hook (with no args) after the test.
  beforeEach(() => {
    embedManyMock.mockReset()
  })

  it('returns [] for empty input without calling the API', async () => {
    const out = await embed([])
    expect(out).toEqual([])
    expect(embedManyMock).not.toHaveBeenCalled()
  })

  it('returns one 1536-dim vector per input text', async () => {
    embedManyMock.mockResolvedValue({
      embeddings: [new Array(1536).fill(0.1), new Array(1536).fill(0.2)],
    })
    const out = await embed(['a', 'b'])
    expect(out).toHaveLength(2)
    expect(out[0]).toHaveLength(1536)
  })

  it('uses the text-embedding-3-small model', async () => {
    embedManyMock.mockResolvedValue({ embeddings: [new Array(1536).fill(0)] })
    await embed(['x'])
    const arg = embedManyMock.mock.calls[0][0]
    expect(arg.model.model).toBe(EMBEDDING_MODEL)
    expect(arg.values).toEqual(['x'])
  })

  it('splits large inputs into batches and preserves order', async () => {
    // A 2647-doc catalog blew OpenAI's 300k tokens/request cap when sent as one
    // request — embed() must chunk the input.
    embedManyMock.mockImplementation(({ values }: { values: string[] }) => ({
      embeddings: values.map((v) => [Number(v)]),
    }))
    const texts = Array.from({ length: 1201 }, (_, i) => String(i))
    const out = await embed(texts)
    expect(embedManyMock.mock.calls.length).toBeGreaterThan(1)
    expect(out).toHaveLength(1201)
    expect(out[0]).toEqual([0])
    expect(out[1200]).toEqual([1200])
    // No single request may carry more than the batch cap.
    for (const call of embedManyMock.mock.calls) {
      expect(call[0].values.length).toBeLessThanOrEqual(500)
    }
  })
})
