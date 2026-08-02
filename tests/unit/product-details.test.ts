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

  it('caps at 600 chars', () => {
    const doc = 'Title\n' + 'x'.repeat(1000)
    expect(docToDetails(doc)!.length).toBe(600)
  })

  it('keeps the Attributes line ahead of long category/tag lines so the cap never eats it', () => {
    const doc = [
      'Sofa-lova M36',
      'Categories: ' + 'Svetainės baldai, '.repeat(20),
      'Tags: ' + 'sofa, '.repeat(50),
      'Attributes: Spalva: Balta; Ilgis: 200 cm',
      'Aprašymas.',
    ].join('\n')
    const details = docToDetails(doc)!
    expect(details.startsWith('Attributes: Spalva: Balta')).toBe(true)
  })

  it('returns undefined for null, empty, or title-only docs', () => {
    expect(docToDetails(null)).toBeUndefined()
    expect(docToDetails('')).toBeUndefined()
    expect(docToDetails('Just a title')).toBeUndefined()
  })
})
