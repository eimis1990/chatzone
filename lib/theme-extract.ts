import { FONT_OPTIONS } from '@/lib/fonts'

/**
 * "Match my website" theme extraction — pure string-in / palette-out helpers.
 *
 * `extractSiteTheme(html, css)` scans a page's HTML (meta theme-color, inline
 * <style> blocks, style="" attributes) plus an optional external stylesheet and
 * ranks candidate brand colors by where they appear:
 *   - <meta name="theme-color">              → strongest signal
 *   - CSS custom props named *primary/brand* → strong signal
 *   - button / link / .btn / CTA rules       → boosted
 *   - background/color declarations          → mild boost + raw frequency
 * Near-white and near-black neutrals are excluded from the primary candidates.
 *
 * `paletteToTheme(palette)` maps the result onto the widget theme fields the
 * configurator can apply (primaryColor, launcherColor, a light botBubbleColor
 * tint, and fontFamily when the site's font matches one of our FONT_OPTIONS).
 *
 * No network or DOM access here — the API route does the fetching (with the
 * SSRF guard); these stay pure so they're trivially unit-testable.
 */

export interface SiteThemePalette {
  /** Best-guess brand color (#rrggbb), if any usable color was found. */
  primary?: string
  /** Ranked non-neutral candidates (#rrggbb), best first (includes `primary`). */
  colors: string[]
  /** Normalized <meta name="theme-color"> value, when present and parseable. */
  themeColorMeta?: string
  /** First concrete (non-generic, non-system) font-family name found. */
  font?: string
}

export interface ExtractedWidgetTheme {
  primaryColor?: string
  launcherColor?: string
  botBubbleColor?: string
  fontFamily?: string
}

// ── Color parsing ───────────────────────────────────────────────────────────

/** Normalize a CSS color token to lowercase #rrggbb. Returns null for anything
 *  unparseable or fully transparent. */
export function normalizeColor(token: string): string | null {
  const t = token.trim().toLowerCase()

  const hex = t.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    const h = hex[1]
    if (h.length === 3 || h.length === 4) {
      if (h.length === 4 && h[3] === '0') return null // alpha 0
      return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`
    }
    if (h.length === 6 || h.length === 8) {
      if (h.length === 8 && h.slice(6) === '00') return null
      return `#${h.slice(0, 6)}`
    }
    return null
  }

  const rgb = t.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (rgb) {
    const chan = (s: string) =>
      s.endsWith('%') ? Math.round((parseFloat(s) / 100) * 255) : Math.round(parseFloat(s))
    const alpha = rgb[4] ? (rgb[4].endsWith('%') ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4])) : 1
    if (alpha === 0) return null
    const [r, g, b] = [chan(rgb[1]), chan(rgb[2]), chan(rgb[3])]
    if ([r, g, b].some((v) => Number.isNaN(v) || v < 0 || v > 255)) return null
    return toHex(r, g, b)
  }

  const hsl = t.match(/^hsla?\(\s*([\d.]+)(?:deg)?\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/)
  if (hsl) {
    const alpha = hsl[4] ? (hsl[4].endsWith('%') ? parseFloat(hsl[4]) / 100 : parseFloat(hsl[4])) : 1
    if (alpha === 0) return null
    return hslToHex(parseFloat(hsl[1]), parseFloat(hsl[2]) / 100, parseFloat(hsl[3]) / 100)
  }

  return null
}

function toHex(r: number, g: number, b: number): string {
  const h = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = ((h % 360) + 360) % 360 / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let [r, g, b] = [0, 0, 0]
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return toHex(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255))
}

/** Near-white or near-black with little chroma — unusable as a brand primary. */
export function isNeutralExtreme(hex: string): boolean {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
  const chroma = Math.max(r, g, b) - Math.min(r, g, b)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (chroma >= 40) return false // clearly colorful, keep regardless of lightness
  return lum > 0.88 || lum < 0.12
}

// ── Extraction ──────────────────────────────────────────────────────────────

// Any color token we know how to normalize.
const COLOR_TOKEN_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g

const BRAND_PROP_RE = /^--[\w-]*(primary|brand|accent|main|theme)[\w-]*$/i
const CTA_SELECTOR_RE = /(?:^|[\s,>+~(])(?:a|button)(?![\w-])|\.btn\b|button|submit|cta|primary|brand|accent|navbar|header/i

const GENERIC_FONTS = new Set([
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', 'ui-rounded',
  'inherit', 'initial', 'unset', 'revert', 'emoji', 'math',
  'blinkmacsystemfont',
])

function collectColors(
  value: string,
  add: (hex: string, weight: number) => void,
  baseWeight: number,
) {
  for (const m of value.match(COLOR_TOKEN_RE) ?? []) {
    const hex = normalizeColor(m)
    if (hex) add(hex, baseWeight)
  }
}

export function extractSiteTheme(html: string, css = ''): SiteThemePalette {
  const weights = new Map<string, number>()
  const add = (hex: string, w: number) => weights.set(hex, (weights.get(hex) ?? 0) + w)

  // 1. <meta name="theme-color" content="…"> — either attribute order.
  let themeColorMeta: string | undefined
  const metaTag = html.match(/<meta\b[^>]*name\s*=\s*["']theme-color["'][^>]*>/i)?.[0]
  const metaContent = metaTag?.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]
  if (metaContent) {
    const hex = normalizeColor(metaContent)
    if (hex) {
      themeColorMeta = hex
      add(hex, 100)
    }
  }

  // 2. Gather CSS: external stylesheet + inline <style> blocks.
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
  const allCss = [css, ...styleBlocks].join('\n')

  // 3. Walk declaration blocks: weight by property + selector context.
  for (const rule of allCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim()
    const ctaBoost = CTA_SELECTOR_RE.test(selector) ? 6 : 0
    for (const decl of rule[2].split(';')) {
      const idx = decl.indexOf(':')
      if (idx === -1) continue
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const value = decl.slice(idx + 1)
      let w = 1
      if (BRAND_PROP_RE.test(prop)) w += 40
      else if (prop === 'background' || prop === 'background-color') w += 2 + ctaBoost
      else if (prop === 'color' || prop === 'fill' || prop === 'border-color') w += 1 + ctaBoost
      collectColors(value, add, w)
    }
  }

  // 4. Inline style="" attributes in the HTML body.
  for (const m of html.matchAll(/style\s*=\s*["']([^"']*)["']/gi)) {
    collectColors(m[1], add, 1)
  }

  // 5. Rank; drop neutrals (near-white/near-black backgrounds and text colors).
  const colors = [...weights.entries()]
    .filter(([hex]) => !isNeutralExtreme(hex))
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex)

  // 6. First concrete font-family.
  let font: string | undefined
  for (const m of allCss.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^["']|["']$/g, '').trim()
      if (!name || name.startsWith('var(') || name.startsWith('-') || name.includes('(')) continue
      if (GENERIC_FONTS.has(name.toLowerCase())) continue
      font = name
      break
    }
    if (font) break
  }

  return { primary: colors[0], colors: colors.slice(0, 8), themeColorMeta, font }
}

// ── Mapping onto the widget theme ───────────────────────────────────────────

/** Mix a hex color toward white; `amount` 0..1 (1 = white). */
export function tintToward(hex: string, amount: number): string {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
  const mix = (v: number) => Math.round(v + (255 - v) * amount)
  return toHex(mix(r), mix(g), mix(b))
}

/** Match a site's font name to one of the configurator's FONT_OPTIONS values. */
export function matchFontOption(name: string): string | undefined {
  const n = name.trim().toLowerCase()
  const opt = FONT_OPTIONS.find(
    (f) =>
      f.value === n ||
      f.label.toLowerCase().replace(/\s*\(.*\)$/, '') === n,
  )
  return opt?.value
}

export function paletteToTheme(palette: SiteThemePalette): ExtractedWidgetTheme {
  const out: ExtractedWidgetTheme = {}
  if (palette.primary) {
    out.primaryColor = palette.primary
    out.launcherColor = palette.primary
    // Bot bubbles get a very light tint of the brand color so replies feel
    // on-brand while text stays readable.
    out.botBubbleColor = tintToward(palette.primary, 0.92)
  }
  if (palette.font) {
    const matched = matchFontOption(palette.font)
    if (matched) out.fontFamily = matched
  }
  return out
}
