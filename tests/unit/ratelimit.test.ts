import { describe, it, expect } from 'vitest'
import { createRateLimiter } from '@/lib/ratelimit'

describe('createRateLimiter (token bucket)', () => {
  it('allows up to capacity, then blocks', () => {
    let t = 0
    const rl = createRateLimiter({ capacity: 2, refillPerSec: 1, now: () => t })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })

  it('refills over time', () => {
    let t = 0
    const rl = createRateLimiter({ capacity: 2, refillPerSec: 1, now: () => t })
    rl.check('a')
    rl.check('a')
    expect(rl.check('a')).toBe(false)
    t += 1000 // one second → one token
    expect(rl.check('a')).toBe(true)
  })

  it('tracks keys independently', () => {
    let t = 0
    const rl = createRateLimiter({ capacity: 1, refillPerSec: 1, now: () => t })
    expect(rl.check('a')).toBe(true)
    expect(rl.check('b')).toBe(true)
    expect(rl.check('a')).toBe(false)
  })
})
