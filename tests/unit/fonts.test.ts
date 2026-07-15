import { describe, expect, it } from 'vitest'
import { FONT_GROUPS, FONT_OPTIONS, fontStack } from '@/lib/fonts'

describe('chat font catalog', () => {
  it('offers a substantial, grouped catalog with unique stored values', () => {
    expect(FONT_OPTIONS.length).toBeGreaterThanOrEqual(24)
    expect(FONT_GROUPS.map((group) => group.label)).toEqual([
      'Modern & business',
      'Friendly & playful',
      'Serif & editorial',
      'Monospace',
    ])
    expect(new Set(FONT_OPTIONS.map((font) => font.value)).size).toBe(FONT_OPTIONS.length)
    expect(FONT_GROUPS.flatMap((group) => group.fonts)).toEqual(FONT_OPTIONS)
  })

  it('includes the requested Urbanist family and falls back safely', () => {
    expect(fontStack('urbanist')).toContain('--font-urbanist')
    expect(FONT_GROUPS.find((group) => group.value === 'friendly')?.fonts.map((font) => font.value)).toEqual(
      expect.arrayContaining(['fredoka', 'baloo', 'dynapuff', 'mali', 'atma']),
    )
    expect(fontStack('not-a-font')).toBe(fontStack('geist'))
  })
})
