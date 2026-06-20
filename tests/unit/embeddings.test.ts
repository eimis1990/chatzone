import { describe, it, expect, vi, beforeEach } from 'vitest'

const embedManyMock = vi.fn()
vi.mock('ai', () => ({ embedMany: (args: unknown) => embedManyMock(args) }))
vi.mock('@ai-sdk/openai', () => ({
  openai: { embedding: (m: string) => ({ model: m }) },
}))

import { embed, EMBEDDING_MODEL } from '@/lib/ai/embeddings'

describe('embed', () => {
  beforeEach(() => embedManyMock.mockReset())

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
})
