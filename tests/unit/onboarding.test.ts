import { describe, it, expect } from 'vitest'
import {
  BUSINESS_TYPES,
  isBusinessTypeId,
  templateNameFor,
  normalizeWebsiteUrl,
  mergeVisualTheme,
} from '@/lib/onboarding'
import { buildEmbedSnippet } from '@/lib/embed-snippet'
import { PRESET_PRESERVED_THEME_KEYS, WIDGET_THEME_PRESETS } from '@/lib/widget-theme-presets'

describe('BUSINESS_TYPES', () => {
  it('has five unique options ending with a general fallback', () => {
    expect(BUSINESS_TYPES).toHaveLength(5)
    const ids = BUSINESS_TYPES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('general')
  })

  it('maps the four template types to the exact owner prompt-library names', () => {
    // These strings must match system_prompts.name rows verbatim — the server
    // action looks templates up by name.
    expect(templateNameFor('ecommerce')).toBe('E-Commerce Store')
    expect(templateNameFor('service')).toBe('Service Business')
    expect(templateNameFor('clinic')).toBe('Clinic & Health Services')
    expect(templateNameFor('b2b')).toBe('Professional Services & B2B')
  })

  it('falls back to the default prompt (null) for general and unknown types', () => {
    expect(templateNameFor('general')).toBeNull()
    expect(templateNameFor('nonsense')).toBeNull()
    expect(templateNameFor('')).toBeNull()
  })

  it('isBusinessTypeId guards picker values', () => {
    expect(isBusinessTypeId('ecommerce')).toBe(true)
    expect(isBusinessTypeId('general')).toBe(true)
    expect(isBusinessTypeId('shop')).toBe(false)
    expect(isBusinessTypeId(42)).toBe(false)
    expect(isBusinessTypeId(null)).toBe(false)
  })
})

describe('normalizeWebsiteUrl', () => {
  it('adds https:// to bare domains the way people type them', () => {
    expect(normalizeWebsiteUrl('mystore.lt')).toBe('https://mystore.lt/')
    expect(normalizeWebsiteUrl('  example.com/shop  ')).toBe('https://example.com/shop')
  })

  it('keeps an explicit scheme', () => {
    expect(normalizeWebsiteUrl('http://example.com')).toBe('http://example.com/')
    expect(normalizeWebsiteUrl('https://example.com/about')).toBe('https://example.com/about')
  })

  it('rejects empty, unparseable, and non-web values', () => {
    expect(normalizeWebsiteUrl('')).toBeNull()
    expect(normalizeWebsiteUrl('   ')).toBeNull()
    expect(normalizeWebsiteUrl('not a url')).toBeNull()
    expect(normalizeWebsiteUrl('ftp://example.com')).toBeNull()
    expect(normalizeWebsiteUrl('localhost')).toBeNull() // no dot — not a public site
  })
})

describe('mergeVisualTheme', () => {
  it('applies visual keys over the current theme', () => {
    const merged = mergeVisualTheme(
      { primaryColor: '#000000', cornerRadius: 16 },
      { primaryColor: '#ff0000', fontFamily: 'lora' },
    )
    expect(merged).toEqual({ primaryColor: '#ff0000', cornerRadius: 16, fontFamily: 'lora' })
  })

  it('never overrides preserved functional keys or applies undefined', () => {
    const current = { position: 'bottom-left', launcherLabel: 'Chat', primaryColor: '#111111' }
    const merged = mergeVisualTheme(current, {
      position: 'bottom-right',
      launcherLabel: '',
      backgroundImageUrl: '',
      primaryColor: undefined,
    })
    expect(merged.position).toBe('bottom-left')
    expect(merged.launcherLabel).toBe('Chat')
    expect(merged.primaryColor).toBe('#111111')
    // backgroundImageUrl is intentionally NOT preserved anymore: an applied
    // theme clears any leftover background photo (the preset's '' passes through).
    expect((merged as Record<string, unknown>).backgroundImageUrl).toBe('')
  })

  it('strips every preserved key from a full preset', () => {
    const preset = WIDGET_THEME_PRESETS[0].theme as Record<string, unknown>
    const merged = mergeVisualTheme<Record<string, unknown>>({}, preset)
    for (const key of PRESET_PRESERVED_THEME_KEYS) {
      expect(key in merged).toBe(false)
    }
    expect(merged.primaryColor).toBe(preset.primaryColor)
  })
})

describe('buildEmbedSnippet', () => {
  it('builds the same script tag the Embed page shows', () => {
    const snippet = buildEmbedSnippet('https://www.loqara.io', 'pk_test_123')
    expect(snippet).toBe(
      '<script\n  src="https://www.loqara.io/widget.js"\n  data-bot-key="pk_test_123"\n  async\n></script>',
    )
  })

  it('carries the bot key and widget src verbatim', () => {
    const snippet = buildEmbedSnippet('', 'abc')
    expect(snippet).toContain('src="/widget.js"')
    expect(snippet).toContain('data-bot-key="abc"')
  })
})
