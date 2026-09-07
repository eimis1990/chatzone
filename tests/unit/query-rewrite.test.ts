import { describe, it, expect } from 'vitest'
import { rewriteQuery, shouldRewriteQuery } from '@/lib/ai/query-rewrite'

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

describe('shouldRewriteQuery', () => {
  it('rewrites on low retrieval confidence', () => {
    expect(shouldRewriteQuery('kaip grąžinti prekę per 14 dienų', true)).toBe(true)
  })
  it('rewrites short affirmations even when retrieval looks confident', () => {
    expect(shouldRewriteQuery('Taip', false)).toBe(true)
    expect(shouldRewriteQuery('yes please', false)).toBe(true)
    expect(shouldRewriteQuery('the first one', false)).toBe(true)
  })
  it('skips the pass for a confident, fully-formed question', () => {
    expect(shouldRewriteQuery('Kokie jūsų darbo laikai savaitgalį?', false)).toBe(false)
  })
})

