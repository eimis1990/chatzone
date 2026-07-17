import { describe, it, expect } from 'vitest'
import { makeProductTools } from '@/lib/ai/commerce-tool'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

const config = {
  commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://x.lt' },
} as unknown as BotConfig
const verskisConfig = {
  ...config,
  commerce: { enabled: true, provider: 'verskis', storeUrl: 'https://shop.test' },
} as unknown as BotConfig

type Exec = (input: unknown, opts: unknown) => Promise<unknown>

describe('search_products failure handling', () => {
  it('adds canonical catalog-form guidance only for Verskis', () => {
    const genericTools = makeProductTools(config, [], undefined, async () => [])
    const verskisTools = makeProductTools(verskisConfig, [], undefined, async () => [])

    expect(genericTools.search_products.description).not.toContain('canonical/nominative')
    expect(verskisTools.search_products.description).toContain('canonical form')
    expect(verskisTools.search_products.description).toContain('inflected conversational phrase')
    expect(genericTools.display_products.description).not.toContain('pass exactly 20 ids')
    expect(verskisTools.display_products.description).toContain('pass exactly 20 ids')
  })

  it('tells the model the search FAILED (not "no products") when the impl throws', async () => {
    const tools = makeProductTools(config, [], undefined, async () => {
      throw new Error('woo down')
    })
    const result = await (tools.search_products.execute as Exec)({ query: 'žvakė' }, {} as never)
    expect(result).toMatchObject({ error: expect.stringContaining('failed') })
  })

  it('returns candidate summaries on success', async () => {
    const product: CommerceProduct = {
      id: 'p1',
      title: 'Žvakė',
      price: '12 €',
      url: 'https://x.lt/p/1',
      inStock: true,
      shortDescription: 'Kvapni žvakė',
    }
    const tools = makeProductTools(config, [], undefined, async () => [product])
    const result = await (tools.search_products.execute as Exec)({ query: 'žvakė' }, {} as never)
    expect(result).toEqual([
      {
        id: 'p1',
        title: 'Žvakė',
        price: '12 €',
        inStock: true,
        description: 'Kvapni žvakė',
        details: undefined,
      },
    ])
  })

  it('tells the model to retry a base category when a narrow search is empty', async () => {
    const tools = makeProductTools(config, [], undefined, async () => [])
    const result = await (tools.search_products.execute as Exec)(
      { query: 'kapučino sofa' },
      {} as never,
    )
    expect(result).toMatchObject({
      noMatches: true,
      nextAction: expect.stringContaining('base product noun'),
    })
  })

  it('includes details for the top 8 results only (token budget)', async () => {
    const many: CommerceProduct[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      title: `Product ${i}`,
      price: '10 €',
      url: `https://x.lt/p/${i}`,
      inStock: true,
      details: `Categories: X\nAttributes: attr ${i}`,
    }))
    const tools = makeProductTools(config, [], undefined, async () => many)
    const result = (await (tools.search_products.execute as Exec)(
      { query: 'q' },
      {} as never,
    )) as { details?: string }[]
    expect(result[0].details).toContain('attr 0')
    expect(result[7].details).toContain('attr 7')
    expect(result[8].details).toBeUndefined()
    expect(result[9].details).toBeUndefined()
  })

  it('lets Verskis review the first 20 structured candidates without changing neutral providers', async () => {
    const many: CommerceProduct[] = Array.from({ length: 22 }, (_, i) => ({
      id: `v${i}`,
      title: `Kėdė ${i}`,
      price: '50 €',
      url: `https://shop.test/kede-${i}`,
      inStock: true,
      details: `Categories: Kėdės\nAttributes: Spalva: Žalia; item ${i}`,
    }))
    const tools = makeProductTools(verskisConfig, [], undefined, async () => many)
    const result = (await (tools.search_products.execute as Exec)(
      { query: 'žalia kėdė' },
      {} as never,
    )) as { details?: string }[]

    expect(result[19].details).toContain('item 19')
    expect(result[20].details).toBeUndefined()
    expect(result[21].details).toBeUndefined()
  })
})

describe('get_product_details registration', () => {
  it('registers for woocommerce', () => {
    const tools = makeProductTools(config, [], undefined, async () => [])
    expect(tools.get_product_details).toBeDefined()
  })

  it('registers for Verskis product-page details', () => {
    const tools = makeProductTools(verskisConfig, [], undefined, async () => [])
    expect(tools.get_product_details).toBeDefined()
  })

  it('is not registered for a feed provider (no live details API)', () => {
    const feedConfig = {
      commerce: { enabled: true, provider: 'feed', feedUrl: 'https://x.lt/feed.xml' },
    } as unknown as BotConfig
    const tools = makeProductTools(feedConfig, [], undefined, async () => [])
    expect(tools.get_product_details).toBeUndefined()
  })
})

describe('display_products with previously shown cards', () => {
  const shownCard: CommerceProduct = {
    id: 'old1',
    title: 'Rankų kremas',
    price: '8 €',
    url: 'https://x.lt/p/old1',
    inStock: true,
  }

  it('re-shows a prior-turn card by id without a fresh search', async () => {
    const sink: CommerceProduct[] = []
    const shown = new Map([[shownCard.id, shownCard]])
    const tools = makeProductTools(config, sink, undefined, async () => [], new Map(), shown)
    const result = await (tools.display_products.execute as Exec)(
      { productIds: ['old1'] },
      {} as never,
    )
    expect(result).toEqual({ shown: 1 })
    expect(sink).toEqual([shownCard])
  })

  it('keeps shown cards out of candidates so the safety net cannot re-render them', async () => {
    const candidates = new Map<string, CommerceProduct>()
    const shown = new Map([[shownCard.id, shownCard]])
    makeProductTools(config, [], undefined, async () => [], candidates, shown)
    // The safety net renders from `candidates` — pre-seeded shown cards must not leak there.
    expect(candidates.size).toBe(0)
  })

  it('does not mix prior-turn cards into a fresh search result set', async () => {
    const freshCard: CommerceProduct = {
      id: 'new1',
      title: 'Žalia kėdė',
      price: '59 €',
      url: 'https://x.lt/p/new1',
      inStock: true,
    }
    const sink: CommerceProduct[] = []
    const shown = new Map([[shownCard.id, shownCard]])
    const tools = makeProductTools(config, sink, undefined, async () => [freshCard], new Map(), shown)

    await (tools.search_products.execute as Exec)({ query: 'žalia kėdė' }, {} as never)
    const result = await (tools.display_products.execute as Exec)(
      { productIds: ['old1', 'new1'] },
      {} as never,
    )

    expect(result).toEqual({ shown: 1 })
    expect(sink).toEqual([freshCard])
  })
})
