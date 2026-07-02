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
