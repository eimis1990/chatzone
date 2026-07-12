import { describe, it, expect } from 'vitest'
import { docToDetails } from '@/lib/products/search'

describe('docToDetails', () => {
  it('drops the title line and keeps the comparison material', () => {
    const doc = [
      'Kvapni žvakė Vanilla',
      'Categories: Namų kvapai',
      'Tags: žvakė, vanilė',
      'Attributes: Kvapas: vanilė; Dydis: 250g',
      'Sojų vaško žvakė su medine dagtimi.',
    ].join('\n')
    const details = docToDetails(doc)
    expect(details).not.toContain('Kvapni žvakė Vanilla')
    expect(details).toContain('Categories: Namų kvapai')
    expect(details).toContain('Attributes: Kvapas: vanilė; Dydis: 250g')
    expect(details).toContain('Sojų vaško žvakė')
  })

  it('caps at 400 chars', () => {
    const doc = 'Title\n' + 'x'.repeat(1000)
    expect(docToDetails(doc)!.length).toBe(400)
  })

  it('returns undefined for null, empty, or title-only docs', () => {
    expect(docToDetails(null)).toBeUndefined()
    expect(docToDetails('')).toBeUndefined()
    expect(docToDetails('Just a title')).toBeUndefined()
  })
})
