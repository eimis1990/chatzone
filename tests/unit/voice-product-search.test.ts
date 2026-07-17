import { describe, expect, it } from 'vitest'
import {
  selectVoiceProductCandidates,
  voiceProductCandidateSummary,
} from '@/lib/ai/voice-product-search'
import type { CommerceProduct } from '@/lib/commerce/types'

function product(id: string, details: string): CommerceProduct {
  return {
    id,
    title: `Bed ${id}`,
    price: '500.00',
    url: `https://example.com/${id}`,
    inStock: true,
    details,
  }
}

describe('voiceProductCandidateSummary', () => {
  it('returns candidate ids and structured facts without claiming cards were shown', () => {
    const summary = voiceProductCandidateSummary(
      [
        product('matching', 'Attributes: Ilgis: 200 cm; Plotis: 180 cm'),
        product('too-wide', 'Attributes: Ilgis: 220 cm; Plotis: 200 cm'),
      ],
      2,
    )

    expect(summary).toContain('NOT shown')
    expect(summary).toContain('"id":"matching"')
    expect(summary).toContain('Ilgis: 200 cm; Plotis: 180 cm')
    expect(summary).toContain('Call display_products once')
    expect(summary).not.toContain('Showing 2 matching products')
  })

  it('honors the provider-specific details budget', () => {
    const summary = voiceProductCandidateSummary(
      [product('first', 'first facts'), product('second', 'second facts')],
      1,
    )

    expect(summary).toContain('first facts')
    expect(summary).not.toContain('second facts')
  })

  it('displays only valid unique ids from the latest candidate set', () => {
    const first = product('first', 'first facts')
    const second = product('second', 'second facts')
    const candidates = new Map([
      [first.id, first],
      [second.id, second],
    ])

    expect(
      selectVoiceProductCandidates(candidates, ['missing', 'second', 'second', 'first']),
    ).toEqual([second, first])
  })
})
