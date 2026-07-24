import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/lib/commerce', () => ({
  searchStore: vi.fn(async () => []),
  listStoreProductsByUrl: vi.fn(async () => []),
}))
vi.mock('@/lib/ai/embeddings', () => ({ embedOne: vi.fn(async () => []) }))

import { searchCatalog } from '@/lib/products/search'
import { listStoreProductsByUrl, searchStore } from '@/lib/commerce'

const listMock = vi.mocked(listStoreProductsByUrl)
const searchMock = vi.mocked(searchStore)

const bot = {
  id: 'bot-1',
  config: {
    commerce: { enabled: true, provider: 'woocommerce', storeUrl: 'https://www.karakara.lt' },
  },
} as unknown as Parameters<typeof searchCatalog>[0]

// searchCatalog only touches db when a semantic index exists; the woo path
// short-circuits before that, so a stub is enough.
const db = {
  from: () => ({ select: () => ({ eq: async () => ({ count: 0 }) }) }),
} as unknown as SupabaseClient

const product = (id: string, inStock = true) => ({
  id,
  title: `P${id}`,
  url: `https://www.karakara.lt/p/${id}`,
  price: '9.99',
  currency: 'EUR',
  inStock,
})

beforeEach(() => {
  listMock.mockClear()
  searchMock.mockClear()
})

describe('searchCatalog URL queries', () => {
  it('detects a URL embedded in a sentence and lists that page, 20 by default', async () => {
    listMock.mockResolvedValueOnce([product('1'), product('2')])
    const out = await searchCatalog(
      bot,
      'Show first 10 products from this page https://www.karakara.lt/produktai/aktyviam-gyvenimui/',
      db,
    )
    expect(listMock).toHaveBeenCalledWith(
      expect.anything(),
      'https://www.karakara.lt/produktai/aktyviam-gyvenimui/',
      20,
    )
    expect(out.map((p) => p.id)).toEqual(['1', '2'])
  })

  it('strips trailing punctuation from the extracted URL', async () => {
    listMock.mockResolvedValueOnce([product('1')])
    await searchCatalog(bot, 'Products from https://www.karakara.lt/produktai/naujienos/.', db)
    expect(listMock).toHaveBeenCalledWith(
      expect.anything(),
      'https://www.karakara.lt/produktai/naujienos/',
      20,
    )
  })

  it('falls back to slug-word search when the page yields nothing', async () => {
    listMock.mockResolvedValueOnce([])
    await searchCatalog(bot, 'https://www.karakara.lt/produktai/aktyviam-gyvenimui/', db)
    expect(searchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ query: 'aktyviam gyvenimui' }),
    )
  })
})
