import { describe, it, expect } from 'vitest'
import { entitlementsFor } from '@/lib/entitlements'
import type { Plan } from '@/lib/types'

describe('entitlementsFor — plan limits', () => {
  it('Free: 1 bot, English only, no lead capture / badge / retention / teams', () => {
    const e = entitlementsFor('free')
    expect(e.maxBots).toBe(1)
    expect(e.allLanguages).toBe(false)
    expect(e.leadCapture).toBe(false)
    expect(e.removeBadge).toBe(false)
    expect(e.customRetention).toBe(false)
    expect(e.teams).toBe(false)
    expect(e.conversations).toBe(100)
  })

  it('Starter: 2 bots, languages + lead capture + badge removal', () => {
    const e = entitlementsFor('starter')
    expect(e.maxBots).toBe(2)
    expect(e.allLanguages).toBe(true)
    expect(e.leadCapture).toBe(true)
    expect(e.removeBadge).toBe(true)
    expect(e.customRetention).toBe(false)
    expect(e.conversations).toBe(1500)
  })

  it('Growth: 5 bots', () => {
    const e = entitlementsFor('growth')
    expect(e.maxBots).toBe(5)
    expect(e.conversations).toBe(4000)
  })

  it('Scale: unlimited bots + custom retention + teams', () => {
    const e = entitlementsFor('scale')
    expect(e.maxBots).toBe(Infinity)
    expect(e.customRetention).toBe(true)
    expect(e.teams).toBe(true)
    expect(e.conversations).toBe(12000)
  })

  it('Enterprise: everything unlimited', () => {
    const e = entitlementsFor('enterprise')
    expect(e.maxBots).toBe(Infinity)
    expect(e.conversations).toBe(Infinity)
    expect(e.customRetention).toBe(true)
  })

  it('falls back to Free for null / undefined / unknown', () => {
    expect(entitlementsFor(null)).toEqual(entitlementsFor('free'))
    expect(entitlementsFor(undefined)).toEqual(entitlementsFor('free'))
    expect(entitlementsFor('mystery' as Plan)).toEqual(entitlementsFor('free'))
  })

  it('bot limits increase monotonically by tier', () => {
    expect(entitlementsFor('free').maxBots).toBeLessThan(entitlementsFor('starter').maxBots)
    expect(entitlementsFor('starter').maxBots).toBeLessThan(entitlementsFor('growth').maxBots)
    expect(entitlementsFor('growth').maxBots).toBeLessThan(entitlementsFor('scale').maxBots)
  })

  it('conversation allowances increase by tier (the per-org monthly pool)', () => {
    // Usage is counted org-wide (all bots combined) against this single number.
    const order: Plan[] = ['free', 'starter', 'growth', 'scale']
    const limits = order.map((p) => entitlementsFor(p).conversations)
    expect(limits).toEqual([...limits].sort((a, b) => a - b))
  })
})
