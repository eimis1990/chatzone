import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  applyProductSearchSynonyms,
  rewriteProductQueryWithSynonyms,
} from '@/lib/products/synonyms'

describe('rewriteProductQueryWithSynonyms', () => {
  it('rewrites approved shopper wording case-insensitively', () => {
    expect(
      rewriteProductQueryWithSynonyms('Show me COUCHES under 900', [
        { phrase: 'couches', replacement: 'sofas' },
      ]),
    ).toBe('Show me sofas under 900')
  })

  it('applies longer phrases before their shorter overlaps', () => {
    expect(
      rewriteProductQueryWithSynonyms('I need a washable sofa cover', [
        { phrase: 'sofa cover', replacement: 'slipcover' },
        { phrase: 'washable sofa cover', replacement: 'machine-washable slipcover' },
      ]),
    ).toBe('I need a machine-washable slipcover')
  })

  it('does not rewrite a phrase embedded inside a larger word', () => {
    expect(
      rewriteProductQueryWithSynonyms('The uncouchable option', [
        { phrase: 'couch', replacement: 'sofa' },
      ]),
    ).toBe('The uncouchable option')
  })

  it('supports non-Latin word boundaries', () => {
    expect(
      rewriteProductQueryWithSynonyms('Ieškau sofutės svetainei', [
        { phrase: 'sofutės', replacement: 'sofos' },
      ]),
    ).toBe('Ieškau sofos svetainei')
  })
})

describe('applyProductSearchSynonyms', () => {
  it('keeps the original query if the synonym lookup throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const db = {
      from: () => {
        throw new Error('relation does not exist')
      },
    } as unknown as SupabaseClient

    await expect(applyProductSearchSynonyms(db, 'bot-1', 'blue couch')).resolves.toBe(
      'blue couch',
    )
    expect(errorSpy).toHaveBeenCalledOnce()
    errorSpy.mockRestore()
  })
})
