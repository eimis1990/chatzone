import { describe, it, expect } from 'vitest'
import { pickLane, fastLaneConfig, FAST_LANE_SIMILARITY } from '@/lib/ai/fast-lane'
import type { BotConfig } from '@/lib/types'

const shop = {
  fastLane: true,
  commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://shop.example' },
} as unknown as BotConfig
const kbOnly = { fastLane: true, commerce: { enabled: false } } as unknown as BotConfig
const strong = FAST_LANE_SIMILARITY + 0.1
const weak = FAST_LANE_SIMILARITY - 0.1

describe('pickLane', () => {
  it('is off unless the bot opts in', () => {
    expect(pickLane({ ...shop, fastLane: false }, 'What is your return policy?', strong)).toBe('full')
  })

  it('answers strong KB hits without tool intent on the fast lane', () => {
    expect(pickLane(shop, 'What is your return policy?', strong, undefined, true)).toBe('fast')
    // The chip wrapper and the Lithuanian returns label must not trip the guard.
    expect(
      pickLane(shop, '[Visitor clicked "Prekių grąžinimas" — internal instruction: ]', strong, undefined, true),
    ).toBe('fast')
    expect(pickLane(shop, 'Kokiu el. paštu galiu susisiekti?', strong, undefined, true)).toBe('fast')
  })

  it('keeps weak retrieval on the full lane', () => {
    expect(pickLane(shop, 'What is your return policy?', weak)).toBe('full')
  })

  it('keeps anything a commerce tool owns on the full lane', () => {
    for (const m of [
      'Do you offer gift cards?',
      'Ar turite dovanų kuponų?',
      'Noriu sužinoti savo užsakymo būseną',
      'How much does delivery cost?',
      'Kiek kainuoja pristatymas į paštomatą?',
      'Is there a discount code?',
      'Recommend a candle for my wife',
      'Ieškau sofos svetainei',
    ]) {
      expect(pickLane(shop, m, strong), m).toBe('full')
    }
  })

  it('store bots only go fast when the top hit is a canonical summary', () => {
    // A crawled shop page (category link lists) scores high on product nouns —
    // skipping tools there means no product cards at all.
    expect(pickLane(shop, 'Labas noriu veido kremo mišriai odai', strong)).toBe('full')
    expect(pickLane(shop, 'Labas noriu veido kremo mišriai odai', strong, undefined, false)).toBe('full')
    expect(pickLane(shop, 'Kokia jūsų grąžinimo politika?', strong, undefined, true)).toBe('fast')
    // KB-only bots never had tools to skip — unchanged.
    expect(pickLane(kbOnly, 'Labas noriu veido kremo mišriai odai', strong)).toBe('fast')
  })

  it('stays on the full lane while product cards are on screen', () => {
    const shown = [{ id: '1', title: 'Candle', price: '€10', inStock: true }]
    expect(pickLane(shop, 'Is the first one scented?', strong, shown, true)).toBe('full')
  })

  it('needs no intent guard when the bot has no store', () => {
    expect(pickLane(kbOnly, 'Do you offer gift cards?', strong)).toBe('fast')
  })

  it('fastLaneConfig disables the commerce prompt block only', () => {
    const cfg = fastLaneConfig(shop)
    expect(cfg.commerce.enabled).toBe(false)
    expect(cfg.commerce.storeUrl).toBe('https://shop.example')
    expect(shop.commerce.enabled).toBe(true)
  })
})
