import { describe, it, expect, vi } from 'vitest'
import { retrieveContext } from '@/lib/ai/retrieval'
import type { MatchedChunk } from '@/lib/types'

const embedQuery = vi.fn(async () => new Array(1536).fill(0.1))

describe('retrieveContext', () => {
  it('returns mapped context chunks and isWeak=false when matches exist', async () => {
    const matched: MatchedChunk[] = [
      { id: 'c1', content: 'open 9-5', source_id: 's1', similarity: 0.8 },
    ]
    const matchChunks = vi.fn(async () => matched)
    const res = await retrieveContext('bot1', 'hours?', {}, { embedQuery, matchChunks })
    expect(res.isWeak).toBe(false)
    expect(res.chunks).toEqual([{ content: 'open 9-5', source_id: 's1' }])
    expect(embedQuery).toHaveBeenCalledWith('hours?')
    // The query text is forwarded to the matcher (full-text channel of hybrid).
    expect(matchChunks).toHaveBeenCalledWith('bot1', expect.any(Array), 'hours?', 5, 0.2)
  })

  it('flags isWeak when no chunks clear the threshold', async () => {
    const matchChunks = vi.fn(async () => [] as MatchedChunk[])
    const res = await retrieveContext('bot1', 'unknown', {}, { embedQuery, matchChunks })
    expect(res.isWeak).toBe(true)
    expect(res.chunks).toEqual([])
  })

  it('passes k and minSimilarity through to the matcher', async () => {
    const matchChunks = vi.fn(async () => [] as MatchedChunk[])
    await retrieveContext('bot1', 'q', { k: 8, minSimilarity: 0.5 }, { embedQuery, matchChunks })
    expect(matchChunks).toHaveBeenCalledWith('bot1', expect.any(Array), 'q', 8, 0.5)
  })
})
