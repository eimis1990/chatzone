import { describe, it, expect } from 'vitest'
import {
  WIDGET_THEME_PRESETS,
  PRESET_PRESERVED_THEME_KEYS,
} from '@/lib/widget-theme-presets'
import { botConfigFormSchema } from '@/lib/validation/schemas'
import { FONT_OPTIONS } from '@/lib/fonts'

// The theme sub-schema exactly as the config form / server validate it.
const themeSchema = botConfigFormSchema.shape.theme

describe('WIDGET_THEME_PRESETS', () => {
  it('has 8 presets with unique ids and names', () => {
    expect(WIDGET_THEME_PRESETS.length).toBe(8)
    
    const ids = WIDGET_THEME_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const names = WIDGET_THEME_PRESETS.map((p) => p.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('every preset theme parses against the BotConfig theme schema unchanged', () => {
    for (const preset of WIDGET_THEME_PRESETS) {
      const parsed = themeSchema.parse(preset.theme)
      // Parsing must not alter any value the preset specifies (no coercion,
      // no defaults kicking in over explicit values).
      for (const [key, value] of Object.entries(preset.theme)) {
        expect(parsed[key as keyof typeof parsed], `${preset.id}.${key}`).toEqual(value)
      }
    }
  })

  it('every preset uses a font from FONT_OPTIONS', () => {
    const fonts = new Set(FONT_OPTIONS.map((f) => f.value))
    for (const preset of WIDGET_THEME_PRESETS) {
      expect(fonts.has(preset.theme.fontFamily), preset.id).toBe(true)
    }
  })

  it('presets are visually distinct (unique primary colors)', () => {
    const primaries = WIDGET_THEME_PRESETS.map((p) => p.theme.primaryColor)
    expect(new Set(primaries).size).toBe(primaries.length)
  })

  it('preserved keys are real theme-schema keys', () => {
    const shape = Object.keys(themeSchema.unwrap().shape)
    for (const key of PRESET_PRESERVED_THEME_KEYS) {
      expect(shape, key).toContain(key)
    }
  })

  it('exactly one preset showcases glass bubbles', () => {
    expect(WIDGET_THEME_PRESETS.filter((p) => p.theme.glassBubbles)).toHaveLength(1)
  })
})

describe('light/dark split', () => {
  it('offers 4 light and 4 dark presets', async () => {
    const { luminance } = await import('@/lib/theme-extract')
    const dark = WIDGET_THEME_PRESETS.filter((p) => luminance(p.theme.backgroundColor!) < 0.5)
    expect(dark).toHaveLength(4)
    expect(WIDGET_THEME_PRESETS).toHaveLength(8)
  })

  it('presets clear a leftover background image', () => {
    for (const p of WIDGET_THEME_PRESETS) expect(p.theme.backgroundImageUrl).toBe('')
  })
})
