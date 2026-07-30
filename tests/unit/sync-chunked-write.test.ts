import { describe, it, expect } from 'vitest'
import { runChunkedWrite } from '@/lib/products/sync'

const TIMEOUT = { message: 'canceling statement due to statement timeout', code: '57014' }

describe('runChunkedWrite', () => {
  it('writes everything in fixed chunks when nothing times out', async () => {
    const written: number[][] = []
    await runChunkedWrite(
      [1, 2, 3, 4, 5],
      2,
      async (chunk) => {
        written.push(chunk)
        return { error: null }
      },
      'test',
    )
    expect(written).toEqual([[1, 2], [3, 4], [5]])
  })

  it('halves the batch and retries the same position on statement timeout', async () => {
    const attempts: number[] = []
    const items = Array.from({ length: 100 }, (_, i) => i)
    await runChunkedWrite(
      items,
      50,
      async (chunk) => {
        attempts.push(chunk.length)
        // Anything over 10 rows "times out" — the runner must shrink until it fits.
        return chunk.length > 10 ? { error: TIMEOUT } : { error: null }
      },
      'test',
    )
    // 50 → 25 → 12 → 6, then 6-row chunks to the end: every item written exactly once.
    const writtenCount = attempts.filter((n) => n <= 10).reduce((a, b) => a + b, 0)
    expect(writtenCount).toBe(100)
    expect(Math.max(...attempts.slice(attempts.findIndex((n) => n <= 10)))).toBeLessThanOrEqual(10)
  })

  it('reports progress with the written count', async () => {
    const progress: number[] = []
    await runChunkedWrite(
      [1, 2, 3],
      2,
      async () => ({ error: null }),
      'test',
      (n) => progress.push(n),
    )
    expect(progress).toEqual([2, 3])
  })

  it('surfaces a timeout on a single row as a real error', async () => {
    await expect(
      runChunkedWrite([1], 10, async () => ({ error: TIMEOUT }), 'single-row'),
    ).rejects.toThrow(/single-row failed/)
  })

  it('throws immediately on non-timeout errors', async () => {
    let calls = 0
    await expect(
      runChunkedWrite(
        [1, 2, 3, 4],
        2,
        async () => {
          calls++
          return { error: { message: 'permission denied' } }
        },
        'perm',
      ),
    ).rejects.toThrow(/perm failed: permission denied/)
    expect(calls).toBe(1)
  })
})
