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
  it('has 5–6 presets with unique ids and names', () => {
    expect(WIDGET_THEME_PRESETS.length).toBeGreaterThanOrEqual(5)
    expect(WIDGET_THEME_PRESETS.length).toBeLessThanOrEqual(6)
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
