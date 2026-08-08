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

describe('smarter extraction (v3)', () => {
  it('resolves var() references to custom-property colors', () => {
    const css = `
      :root { --cta-bg: #16a34a; }
      .btn { background: var(--cta-bg); }
      p { color: #336699; } span { color: #336699; }
    `
    expect(extractSiteTheme('', css).primary).toBe('#16a34a')
  })

  it('prefers a saturated brand color over a more frequent washed-out grey', () => {
    const css = `
      .a { color: #d8d8e0; } .b { color: #d8d8e0; } .c { color: #d8d8e0; }
      .d { color: #d8d8e0; } .e { color: #d8d8e0; }
      .btn { background: #e11d48; }
    `
    expect(extractSiteTheme('', css).primary).toBe('#e11d48')
  })

  it('reads the median button radius and maps it onto widget corners', () => {
    const round = extractSiteTheme('', `.btn { border-radius: 12px; } button { border-radius: 14px; } .btn-alt { border-radius: 12px; }`)
    expect(round.buttonRadius).toBe(12)
    const roundTheme = paletteToTheme(round)
    expect(roundTheme.cornerRadius).toBe(20)
    expect(roundTheme.headerStyle).toBe('curved')

    const sharp = paletteToTheme(extractSiteTheme('', `.btn { border-radius: 2px; }`))
    expect(sharp.cornerRadius).toBe(6)
    expect(sharp.headerStyle).toBe('classic')
  })

  it('treats pill buttons as maximally round', () => {
    const p = extractSiteTheme('', `.btn { border-radius: 9999px; }`)
    expect(p.pillButtons).toBe(true)
    expect(paletteToTheme(p).headerStyle).toBe('curved')
  })

  it('darkens a too-pale primary until it can carry light text', async () => {
    const { luminance } = await import('@/lib/theme-extract')
    const theme = paletteToTheme({ primary: '#ffee55', colors: ['#ffee55'] })
    expect(theme.primaryColor).not.toBe('#ffee55')
    expect(luminance(theme.primaryColor!)).toBeLessThanOrEqual(0.73)
  })

  it('finds a JSON-LD logo and a header image before falling back to icons', () => {
    const jsonLd = `<script type="application/ld+json">{"logo":"https://acme.com/logo.png"}</script>`
    expect(extractSiteTheme(jsonLd).logo).toBe('https://acme.com/logo.png')

    const headerImg = `<header class="top"><img src="/brand-mark.png" alt="Acme"></header>`
    expect(extractSiteTheme(headerImg).logo).toBe('/brand-mark.png')
  })

  it('reads lazy-loaded logo images (data-src / srcset)', () => {
    const html = `<img class="logo" data-src="/lazy-logo.svg">`
    expect(extractSiteTheme(html).logo).toBe('/lazy-logo.svg')
  })
})

describe('real-world hardening (v4, from the vibinter.com debug)', () => {
  it('reads shadcn HSL channel tokens: --primary wins, --background sets the canvas', () => {
    const css = `
      :root { --primary: 240 5.9% 10%; --background: 0 0% 100%; }
      body { background-color: hsl(var(--background)); }
      .noise { color: #c0392b; } .noise2 { color: #c0392b; } .noise3 { color: #c0392b; }
    `
    const p = extractSiteTheme('', css)
    expect(p.primary).toBe('#18181b')
    expect(p.pageBackground).toBe('#ffffff')
  })

  it('ignores vendor-library custom props (react-day-picker blues)', () => {
    const css = `
      .rdp { --rdp-accent-color: #00f; --rdp-accent-color-dark: #3003e1; }
      .btn { background: #16a34a; }
    `
    const p = extractSiteTheme('', css)
    expect(p.primary).toBe('#16a34a')
  })

  it('drops prefers-color-scheme:dark blocks so a stock dark fallback cannot win', () => {
    const html = `<style>
      body { background: #ffffff; }
      @media (prefers-color-scheme: dark) { body { color: #fff; background: #000000; } }
    </style>`
    expect(extractSiteTheme(html).pageBackground).toBe('#ffffff')
  })

  it('never mistakes a saturated accent for a card surface', () => {
    const css = `
      body { background: #ffffff; }
      .card { background: #f59e0b; }
    `
    expect(extractSiteTheme('', css).surface).toBeUndefined()
  })

  it('only trusts a LIGHT fallback page background on frequency alone', () => {
    // No body/html rule; dark section surfaces dominate — must not go black.
    const css = `
      .hero { background: #0f0f0f; } .panel { background: #0f0f0f; }
      .strip { background: #0f0f0f; } .light { background: #fafafa; }
    `
    expect(extractSiteTheme('', css).pageBackground).toBe('#fafafa')
  })

  it('skips Next.js font-loader hash names', () => {
    const css = `body { font-family: __Inter_f367f3, Poppins, sans-serif; }`
    expect(extractSiteTheme('', css).font).toBe('Poppins')
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

describe('site background / surface / logo extraction (v2)', () => {
  const html = `
    <html><head>
      <link rel="icon" href="/favicon.ico">
      <link rel="apple-touch-icon" href="/apple-icon.png">
    </head><body>
      <img class="site-logo" src="/img/logo.svg" alt="Acme logo">
      <style>
        body { background-color: #101014; color: #fff; }
        .card { background: #1c1c22; }
        .btn-primary { background-color: #f59e0b; }
      </style>
    </body></html>`

  it('extracts the page background even when it is a neutral', async () => {
    const { extractSiteTheme } = await import('@/lib/theme-extract')
    const p = extractSiteTheme(html)
    expect(p.pageBackground).toBe('#101014')
    expect(p.surface).toBe('#1c1c22')
  })

  it('prefers an <img> logo over icons', async () => {
    const { extractSiteTheme } = await import('@/lib/theme-extract')
    expect(extractSiteTheme(html).logo).toBe('/img/logo.svg')
  })

  it('falls back to the apple-touch-icon when no logo img exists', async () => {
    const { extractSiteTheme } = await import('@/lib/theme-extract')
    const noImg = html.replace(/<img[^>]*>/, '')
    expect(extractSiteTheme(noImg).logo).toBe('/apple-icon.png')
  })

  it('maps a dark site onto a dark widget theme with same-scheme bubbles', async () => {
    const { extractSiteTheme, paletteToTheme, luminance } = await import('@/lib/theme-extract')
    const theme = paletteToTheme(extractSiteTheme(html))
    expect(theme.backgroundColor).toBe('#101014')
    expect(theme.backgroundImageUrl).toBe('')
    expect(theme.botBubbleColor).toBe('#1c1c22')
    expect(theme.primaryColor).toBe('#f59e0b')
    expect(luminance(theme.bubbleBorderColor!)).toBeLessThan(0.5)
  })

  it('rejects a cross-scheme surface (inverted footer is not a card)', async () => {
    const { extractSiteTheme } = await import('@/lib/theme-extract')
    const lightPage = `<style>body{background:#ffffff}.footer{background:#111111}</style>`
    expect(extractSiteTheme(lightPage).surface).toBeUndefined()
  })
})
