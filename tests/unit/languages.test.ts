import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  languageMeta,
} from '@/lib/i18n/languages'

describe('language registry', () => {
  it('lists English first, then Lithuanian', () => {
    expect(SUPPORTED_LANGUAGE_CODES).toEqual(['en', 'lt'])
  })

  it('exposes English + native labels and a flag per language', () => {
    const lt = languageMeta('lt')
    expect(lt.label).toBe('Lithuanian')
    expect(lt.nativeLabel).toBe('Lietuvių')
    expect(lt.flag).toBe('🇱🇹')
    expect(languageMeta('en').label).toBe('English')
  })

  it('every registry entry has all display fields', () => {
    for (const l of SUPPORTED_LANGUAGES) {
      expect(l.code).toBeTruthy()
      expect(l.label).toBeTruthy()
      expect(l.nativeLabel).toBeTruthy()
      expect(l.flag).toBeTruthy()
    }
  })
})
