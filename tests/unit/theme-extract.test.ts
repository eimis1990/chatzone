import { describe, it, expect } from 'vitest'
import {
  extractSiteTheme,
  paletteToTheme,
  normalizeColor,
  isNeutralExtreme,
  matchFontOption,
  tintToward,
} from '@/lib/theme-extract'

describe('normalizeColor', () => {
  it('normalizes hex shorthand and long form', () => {
    expect(normalizeColor('#abc')).toBe('#aabbcc')
    expect(normalizeColor('#AaBbCc')).toBe('#aabbcc')
    expect(normalizeColor('#aabbccff')).toBe('#aabbcc')
  })

  it('parses rgb()/rgba()', () => {
    expect(normalizeColor('rgb(255, 0, 128)')).toBe('#ff0080')
    expect(normalizeColor('rgba(255,0,128,0.5)')).toBe('#ff0080')
    expect(normalizeColor('rgb(100% 0% 50%)')).toBe('#ff0080')
  })

  it('parses hsl()', () => {
    expect(normalizeColor('hsl(0, 100%, 50%)')).toBe('#ff0000')
    expect(normalizeColor('hsl(240 100% 50%)')).toBe('#0000ff')
  })

  it('rejects transparent and garbage', () => {
    expect(normalizeColor('rgba(1,2,3,0)')).toBeNull()
    expect(normalizeColor('#abcd0')).toBeNull()
    expect(normalizeColor('currentColor')).toBeNull()
    expect(normalizeColor('var(--x)')).toBeNull()
  })
})

describe('isNeutralExtreme', () => {
  it('flags near-white and near-black', () => {
    expect(isNeutralExtreme('#ffffff')).toBe(true)
    expect(isNeutralExtreme('#f8f9fa')).toBe(true)
    expect(isNeutralExtreme('#000000')).toBe(true)
    expect(isNeutralExtreme('#111827')).toBe(true)
  })

  it('keeps saturated and mid-tone colors', () => {
    expect(isNeutralExtreme('#4f46e5')).toBe(false)
    expect(isNeutralExtreme('#22c55e')).toBe(false)
    expect(isNeutralExtreme('#6b7280')).toBe(false) // mid grey is allowed
    expect(isNeutralExtreme('#ffee00')).toBe(false) // bright but colorful
  })
})

describe('extractSiteTheme', () => {
  it('prefers the theme-color meta tag', () => {
    const html = `<html><head>
      <meta name="theme-color" content="#e11d48">
      <style>body { background: #123456; } body { background: #123456; }</style>
    </head><body></body></html>`
    const p = extractSiteTheme(html)
    expect(p.themeColorMeta).toBe('#e11d48')
    expect(p.primary).toBe('#e11d48')
  })

  it('handles reversed meta attribute order', () => {
    const html = `<meta content="rgb(225, 29, 72)" name="theme-color">`
    expect(extractSiteTheme(html).themeColorMeta).toBe('#e11d48')
  })

  it('weights brand custom properties above plain frequency', () => {
    const css = `
      :root { --color-primary: #7c3aed; --grid-gap: 4px; }
      p { color: #336699; } li { color: #336699; } h2 { color: #336699; }
    `
    expect(extractSiteTheme('', css).primary).toBe('#7c3aed')
  })

  it('boosts button/link/CTA declarations', () => {
    const css = `
      .btn-primary { background-color: #16a34a; }
      p { color: #336699; } span { color: #336699; }
    `
    expect(extractSiteTheme('', css).primary).toBe('#16a34a')
  })

  it('ignores near-white/near-black for the primary', () => {
    const css = `
      body { background: #ffffff; color: #111111; }
      main { background: #fafafa; color: #0a0a0a; }
      a { color: #0d9488; }
    `
    const p = extractSiteTheme('', css)
    expect(p.primary).toBe('#0d9488')
    expect(p.colors).not.toContain('#ffffff')
    expect(p.colors).not.toContain('#111111')
  })

  it('reads inline <style> blocks and style attributes', () => {
    const html = `
      <style>.hero { background: hsl(262, 83%, 58%); }</style>
      <div style="color: hsl(262, 83%, 58%)"></div>
    `
    const p = extractSiteTheme(html)
    expect(p.primary).toBeDefined()
    expect(p.colors.length).toBeGreaterThan(0)
  })

  it('extracts the first concrete font-family, skipping generics and vars', () => {
    const css = `
      code { font-family: ui-monospace, monospace; }
      body { font-family: var(--font-body), -apple-system, BlinkMacSystemFont, "Poppins", sans-serif; }
    `
    // First declaration only has generics → falls through to Poppins.
    expect(extractSiteTheme('', css).font).toBe('Poppins')
  })

  it('returns an empty palette for colorless input', () => {
    const p = extractSiteTheme('<html><body><p>hi</p></body></html>')
    expect(p.primary).toBeUndefined()
    expect(p.colors).toEqual([])
    expect(p.font).toBeUndefined()
  })
})

describe('matchFontOption', () => {
  it('matches configurator fonts case-insensitively', () => {
    expect(matchFontOption('Inter')).toBe('inter')
    expect(matchFontOption('poppins')).toBe('poppins')
    expect(matchFontOption('Plus Jakarta Sans')).toBe('jakarta')
    expect(matchFontOption('Lora')).toBe('lora') // label is "Lora (serif)"
  })

  it('returns undefined for fonts we do not offer', () => {
    expect(matchFontOption('Comic Sans MS')).toBeUndefined()
    expect(matchFontOption('Roboto')).toBeUndefined()
  })
})

describe('paletteToTheme', () => {
  it('maps primary onto primaryColor + launcherColor + a light bubble tint', () => {
    const theme = paletteToTheme({ primary: '#7c3aed', colors: ['#7c3aed'] })
    expect(theme.primaryColor).toBe('#7c3aed')
    expect(theme.launcherColor).toBe('#7c3aed')
    expect(theme.botBubbleColor).toBe(tintToward('#7c3aed', 0.92))
    // The tint must be light (readable behind dark text).
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(theme.botBubbleColor!.slice(i, i + 2), 16))
    expect((r + g + b) / 3).toBeGreaterThan(220)
  })

  it('only sets fontFamily when the font matches an option', () => {
    expect(paletteToTheme({ colors: [], font: 'Inter' }).fontFamily).toBe('inter')
    expect(paletteToTheme({ colors: [], font: 'Roboto' }).fontFamily).toBeUndefined()
  })

  it('returns an empty partial for an empty palette', () => {
    expect(paletteToTheme({ colors: [] })).toEqual({})
  })
})
