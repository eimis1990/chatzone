import { describe, it, expect } from 'vitest'
import { rewriteQuery } from '@/lib/ai/query-rewrite'

describe('rewriteQuery', () => {
  it('returns the rewritten standalone query from the model', async () => {
    const out = await rewriteQuery(
      'o kiek kainuoja?',
      [
        { role: 'user', content: 'Ar turite dovanų kuponų?' },
        { role: 'assistant', content: 'Taip, turime dovanų kuponų.' },
      ],
      async () => 'dovanų kupono kaina',
    )
    expect(out).toBe('dovanų kupono kaina')
  })

  it('strips wrapping quotes from the model output', async () => {
    const out = await rewriteQuery('x', [], async () => '"shipping cost to Lithuania"')
    expect(out).toBe('shipping cost to Lithuania')
  })

  it('returns null when the model output is empty or unchanged', async () => {
    expect(await rewriteQuery('kaina', [], async () => '')).toBeNull()
    expect(await rewriteQuery('kaina', [], async () => 'kaina')).toBeNull()
    expect(await rewriteQuery('Kaina', [], async () => 'kaina')).toBeNull()
  })

  it('returns null when the model call throws', async () => {
    expect(
      await rewriteQuery('x', [], async () => {
        throw new Error('boom')
      }),
    ).toBeNull()
  })
})
