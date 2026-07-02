import { describe, it, expect } from 'vitest'
import { buildDoc, deriveTags, type RawProduct } from '@/lib/products/catalog'

const base: RawProduct = {
  id: '1',
  title: 'Kvapni žvakė',
  url: 'https://x.lt/p/1',
  description: 'Sojų vaško žvakė',
  categories: ['Namų kvapai'],
  attributes: ['Kvapas: vanilė, levanda', 'Dydis: 250g'],
  onSale: false,
  featured: false,
  rank: 50,
}

describe('buildDoc', () => {
  it('embeds attributes so descriptive queries can match', () => {
    const doc = buildDoc(base, deriveTags(base), 'unisex')
    expect(doc).toContain('Attributes: Kvapas: vanilė, levanda; Dydis: 250g')
  })

  it('omits the attributes line when there are none', () => {
    const doc = buildDoc({ ...base, attributes: [] }, [], 'unisex')
    expect(doc).not.toContain('Attributes:')
  })

  it('still leads with the title and includes categories', () => {
    const doc = buildDoc(base, deriveTags(base), 'unisex')
    expect(doc.startsWith('Kvapni žvakė')).toBe(true)
    expect(doc).toContain('Categories: Namų kvapai')
  })
})

describe('fetchWooCatalog', () => {
  it('dedupes products repeated across pages (popularity order shifts)', async () => {
    const { fetchWooCatalog } = await import('@/lib/products/catalog')
    const pages: Record<number, Array<{ id: number; name: string }>> = {
      1: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `P${i + 1}` })),
      // Page 2 re-serves product 100 (order shifted between requests), then ends.
      2: [{ id: 100, name: 'P100' }, { id: 101, name: 'P101' }],
    }
    const fetchImpl = (async (url: string) => {
      const page = Number(new URL(url).searchParams.get('page'))
      return { ok: true, json: async () => pages[page] ?? [] }
    }) as unknown as typeof fetch
    const products = await fetchWooCatalog('https://x.lt', fetchImpl)
    const ids = products.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('101')
    expect(ids.filter((i) => i === '100')).toHaveLength(1)
  })
})
