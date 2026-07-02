import { describe, it, expect } from 'vitest'
import { makeProductTools } from '@/lib/ai/commerce-tool'
import type { BotConfig } from '@/lib/types'
import type { CommerceProduct } from '@/lib/commerce/types'

const config = {
  commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://x.lt' },
} as unknown as BotConfig

type Exec = (input: unknown, opts: unknown) => Promise<unknown>

describe('search_products failure handling', () => {
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
      { id: 'p1', title: 'Žvakė', price: '12 €', inStock: true, description: 'Kvapni žvakė' },
    ])
  })
})
