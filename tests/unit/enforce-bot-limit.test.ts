import { describe, expect, it } from 'vitest'
import { botIdsToPause } from '@/lib/bots/enforce-limit'

const bot = (id: string, status: string, created: string) => ({
  id,
  status,
  created_at: created,
})

describe('botIdsToPause', () => {
  const bots = [
    bot('newest', 'active', '2026-08-01'),
    bot('oldest', 'active', '2026-01-01'),
    bot('middle', 'active', '2026-04-01'),
  ]

  it('keeps the oldest active bots and pauses the newest extras', () => {
    expect(botIdsToPause(bots, 1)).toEqual(['middle', 'newest'])
    expect(botIdsToPause(bots, 2)).toEqual(['newest'])
    expect(botIdsToPause(bots, 3)).toEqual([])
  })

  it('ignores already-paused bots', () => {
    const mixed = [...bots, bot('sleeping', 'paused', '2025-01-01')]
    expect(botIdsToPause(mixed, 1)).toEqual(['middle', 'newest'])
  })

  it('unlimited plans pause nothing; limit 0 pauses all active', () => {
    expect(botIdsToPause(bots, Infinity)).toEqual([])
    expect(botIdsToPause(bots, 0)).toEqual(['oldest', 'middle', 'newest'])
  })
})
