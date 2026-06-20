export interface RateLimiter {
  /** Returns true if the action is allowed (and consumes a token). */
  check(key: string): boolean
}

export interface RateLimiterOptions {
  /** Maximum burst size. */
  capacity: number
  /** Tokens replenished per second. */
  refillPerSec: number
  /** Clock, injectable for tests. */
  now?: () => number
}

/**
 * In-memory token-bucket rate limiter. Suitable for a single serverless
 * instance / dev; swap for a Redis-backed limiter at scale. Keys are tracked
 * independently (e.g. `${botId}:${visitorId}`).
 */
export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const { capacity, refillPerSec } = opts
  const now = opts.now ?? (() => Date.now())
  const buckets = new Map<string, { tokens: number; last: number }>()

  return {
    check(key: string): boolean {
      const t = now()
      let b = buckets.get(key)
      if (!b) {
        b = { tokens: capacity, last: t }
        buckets.set(key, b)
      }
      const elapsedSec = (t - b.last) / 1000
      b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec)
      b.last = t
      if (b.tokens >= 1) {
        b.tokens -= 1
        return true
      }
      return false
    },
  }
}
