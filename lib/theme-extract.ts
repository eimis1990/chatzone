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
  /** The page's own background color (neutrals allowed — pages are often white/near-black). */
  pageBackground?: string
  /** Card/panel/nav surface color — the "subview" background, when distinguishable. */
  surface?: string
  /** Site logo candidate (raw src/href as found in the HTML; caller resolves it). */
  logo?: string
  /** Median border-radius (px) of the site's buttons/inputs, when found. */
  buttonRadius?: number
  /** True when buttons are pill-shaped (50% / 9999px radii). */
  pillButtons?: boolean
}

export interface ExtractedWidgetTheme {
  primaryColor?: string
  launcherColor?: string
  botBubbleColor?: string
  backgroundColor?: string
  backgroundImageUrl?: string
  bubbleBorderColor?: string
  fontFamily?: string
  cornerRadius?: number
  bubbleRadius?: number
  navButtonRadius?: number
  /** Suggested header layout — a preserved key, so plain merges drop it and
   *  only the onboarding save (fresh bot, nothing to preserve) applies it. */
  headerStyle?: 'classic' | 'curved'
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
// Vendor-library custom props ship default palettes that are NOT the site's
// brand (react-day-picker's --rdp-accent-color is a stock blue, etc.).
const VENDOR_PROP_RE = /^--(?:rdp|tw|radix|swiper|toastify|mui|mantine|chakra|rt|cm|ck|fa|un)-/i
// The canonical design token for "the brand color" (shadcn and friends).
const BRAND_TOKEN_RE = /^--(?:color-)?(?:primary|brand|accent)(?:-color)?$/i
const CTA_SELECTOR_RE = /(?:^|[\s,>+~(])(?:a|button)(?![\w-])|\.btn\b|button|submit|cta|primary|brand|accent|navbar|header/i
// Controls whose border-radius reveals the site's shape language.
const CONTROL_SELECTOR_RE = /\.btn\b|button|input(?![\w-])|submit|\bcta\b|badge|pill|tag\b/i

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

/** Relative luminance 0..1 of a #rrggbb color. */
export function luminance(hex: string): number {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

// Selectors describing the page canvas vs. its raised surfaces ("subviews").
const PAGE_BG_RE = /(?:^|[,\s])(?:html|body|:root|#__next|#root|main)(?![\w-])/i
const SURFACE_RE = /card|panel|tile|modal|drawer|sheet|popover|dropdown|menu|sidebar|nav|header|footer|section|article|aside|widget|wrapper|container|form/i

/** shadcn-style HSL channel triplet ("240 5.9% 10%") → #rrggbb, else null. */
function hslChannelsToHex(value: string): string | null {
  const m = value.trim().match(/^([\d.]+)(?:deg)?\s+([\d.]+)%\s+([\d.]+)%$/)
  if (!m) return null
  return hslToHex(parseFloat(m[1]), parseFloat(m[2]) / 100, parseFloat(m[3]) / 100)
}

/**
 * Remove `@media (prefers-color-scheme: dark) { … }` blocks. The widget mirrors
 * the site's default (light) rendering, and frameworks ship a stock
 * `body{background:#000}` dark fallback that otherwise poisons the palette.
 */
export function stripDarkSchemeBlocks(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const at = css.indexOf('@media', i)
    if (at === -1) {
      out += css.slice(i)
      break
    }
    const open = css.indexOf('{', at)
    if (open === -1) {
      out += css.slice(i)
      break
    }
    const condition = css.slice(at, open)
    out += css.slice(i, at)
    // Find the matching closing brace of the media block.
    let depth = 1
    let j = open + 1
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    if (/prefers-color-scheme\s*:\s*dark/i.test(condition)) {
      i = j // drop the whole block
    } else {
      out += css.slice(at, j)
      i = j
    }
  }
  return out
}

export function extractSiteTheme(html: string, css = ''): SiteThemePalette {
  const weights = new Map<string, number>()
  const add = (hex: string, w: number) => weights.set(hex, (weights.get(hex) ?? 0) + w)
  // Backgrounds are tracked separately from brand colors: the page canvas is
  // usually a "neutral" (white / near-black) that the brand ranking excludes.
  const pageBg = new Map<string, number>()
  const surfaceBg = new Map<string, number>()
  const anyBg = new Map<string, number>()
  const bump = (map: Map<string, number>, hex: string, w: number) =>
    map.set(hex, (map.get(hex) ?? 0) + w)

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

  // 2. Gather CSS: external stylesheet + inline <style> blocks, minus
  //    dark-scheme media blocks (stock dark fallbacks are not the site's look).
  const styleBlocks = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
  const allCss = stripDarkSchemeBlocks([css, ...styleBlocks].join('\n'))

  // 3a. Custom properties that resolve to colors — so `background: var(--brand)`
  //     counts as a real color use at the site of the var() reference, which is
  //     where most modern themes actually put their brand color. Values may be
  //     plain colors or shadcn-style HSL channel triplets ("240 5.9% 10%").
  const customProps = new Map<string, string>()
  const rawProps = new Map<string, string>()
  for (const m of allCss.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+)/g)) {
    const value = m[2].trim()
    rawProps.set(m[1], value)
    const hex = normalizeColor(value) ?? hslChannelsToHex(value)
    if (hex) customProps.set(m[1], hex)
  }
  // One-hop indirection: `--primary: var(--blue-600)`.
  for (const [name, value] of rawProps) {
    if (customProps.has(name)) continue
    const ref = value.match(/^var\(\s*(--[\w-]+)\s*\)$/)?.[1]
    const hex = ref ? customProps.get(ref) : undefined
    if (hex) customProps.set(name, hex)
  }
  // The site's own design token beats frequency guessing when present.
  const tokenNames = [...customProps.keys()].filter(
    (name) => BRAND_TOKEN_RE.test(name) && !VENDOR_PROP_RE.test(name),
  )
  const brandToken =
    customProps.get(tokenNames.find((n) => /primary/i.test(n)) ?? tokenNames[0] ?? '')
  const expandVars = (value: string, addTo: (hex: string, w: number) => void, w: number) => {
    for (const v of value.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (VENDOR_PROP_RE.test(v[1])) continue // library defaults, not the brand
      const hex = customProps.get(v[1])
      if (hex) addTo(hex, w)
    }
  }

  // 3b. Walk declaration blocks: weight by property + selector context, and
  //     collect button/input corner radii for the site's control shape.
  const radii: number[] = []
  let pillCount = 0
  for (const rule of allCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim()
    const ctaBoost = CTA_SELECTOR_RE.test(selector) ? 6 : 0
    const isPageBg = PAGE_BG_RE.test(selector)
    const isSurface = SURFACE_RE.test(selector)
    const isControl = CONTROL_SELECTOR_RE.test(selector)
    for (const decl of rule[2].split(';')) {
      const idx = decl.indexOf(':')
      if (idx === -1) continue
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const value = decl.slice(idx + 1)
      let w = 1
      if (BRAND_PROP_RE.test(prop) && !VENDOR_PROP_RE.test(prop)) w += 40
      else if (prop === 'background' || prop === 'background-color') w += 2 + ctaBoost
      else if (prop === 'color' || prop === 'fill' || prop === 'border-color') w += 1 + ctaBoost
      collectColors(value, add, w)
      expandVars(value, add, w)
      // shadcn channel triplets aren't color tokens — resolve brand-named ones.
      if (prop.startsWith('--') && w > 1) {
        const channelHex = hslChannelsToHex(value)
        if (channelHex) add(channelHex, w)
      }
      if (prop === 'background' || prop === 'background-color') {
        const intoBgMaps = (hex: string, bw: number) => {
          bump(anyBg, hex, bw)
          if (isPageBg) bump(pageBg, hex, bw + 30)
          if (isSurface) bump(surfaceBg, hex, bw + 3)
        }
        collectColors(value, intoBgMaps, 1)
        expandVars(value, intoBgMaps, 1)
      }
      if (isControl && prop === 'border-radius') {
        const first = value.trim().split(/\s+/)[0] ?? ''
        if (/^(?:9{3,}px|50%|100vmax)/.test(first)) pillCount++
        else {
          const px = first.match(/^([\d.]+)(px|rem|em)$/)
          if (px) {
            const n = parseFloat(px[1]) * (px[2] === 'px' ? 1 : 16)
            if (n >= 0 && n <= 60) radii.push(n)
          }
        }
      }
    }
  }

  // 4. Inline style="" attributes in the HTML body.
  for (const m of html.matchAll(/style\s*=\s*["']([^"']*)["']/gi)) {
    collectColors(m[1], add, 1)
  }

  // 5. Rank; drop neutrals, then scale raw frequency by brand suitability —
  //    frequency alone loves stray greys and washed-out tints, so colors with
  //    real chroma and usable lightness win ties against noise.
  const suitability = (hex: string): number => {
    const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
    const chroma = Math.max(r, g, b) - Math.min(r, g, b)
    const lum = luminance(hex)
    let f = 0.3 + 0.7 * Math.min(1, chroma / 90)
    if (lum > 0.82) f *= 0.35 // too pale to carry a header or button
    if (lum < 0.1) f *= 0.5 // near-black reads as text, not brand
    return f
  }
  const colors = [...weights.entries()]
    .filter(([hex]) => !isNeutralExtreme(hex))
    .sort((a, b) => b[1] * suitability(b[0]) - a[1] * suitability(a[0]))
    .map(([hex]) => hex)

  // Median control radius; pill shapes tracked separately.
  radii.sort((a, b) => a - b)
  const buttonRadius = radii.length ? radii[Math.floor(radii.length / 2)] : undefined
  const pillButtons = pillCount > 0 && pillCount > radii.length / 2

  // 6. First concrete font-family.
  let font: string | undefined
  for (const m of allCss.matchAll(/font-family\s*:\s*([^;{}]+)/gi)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^["']|["']$/g, '').trim()
      if (!name || name.startsWith('var(') || name.startsWith('-') || name.includes('(')) continue
      if (name.startsWith('__')) continue // Next.js font-loader class hashes
      if (GENERIC_FONTS.has(name.toLowerCase())) continue
      font = name
      break
    }
    if (font) break
  }

  // 7. Page background: an explicit html/body/:root declaration wins. The
  //    fallback only trusts LIGHT frequent backgrounds — dark section/card
  //    surfaces are common on light sites and used to turn the widget black.
  const top = (map: Map<string, number>, skip?: string) =>
    [...map.entries()].filter(([hex]) => hex !== skip).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topLight = (map: Map<string, number>) =>
    [...map.entries()]
      .filter(([hex]) => luminance(hex) >= 0.8)
      .sort((a, b) => b[1] - a[1])[0]?.[0]
  const pageBackground = top(pageBg) ?? topLight(anyBg)

  // 8. Surface ("subview") color: the strongest QUIET card/panel/nav background
  //    that differs from the page canvas but lives in the same light/dark
  //    scheme. Saturated hits are accents (CTAs, banners), not card surfaces,
  //    and a cross-scheme "surface" is usually an inverted footer.
  const quiet = (hex: string) => {
    const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
    return Math.max(r, g, b) - Math.min(r, g, b) <= 40
  }
  const topQuiet = (map: Map<string, number>) =>
    [...map.entries()]
      .filter(([hex]) => hex !== pageBackground && quiet(hex))
      .sort((a, b) => b[1] - a[1])[0]?.[0]
  let surface: string | undefined = topQuiet(surfaceBg) ?? topQuiet(anyBg)
  if (surface && pageBackground && Math.abs(luminance(surface) - luminance(pageBackground)) > 0.45) {
    surface = undefined
  }

  // 9. Logo, best source first: an <img> that self-identifies as the logo
  //    (src / lazy data-src / srcset), a JSON-LD "logo", the first image inside
  //    <header>/<nav>, then apple-touch-icon / favicon. Raw value — the caller
  //    resolves it against the final page URL.
  const imgSrc = (tag: string): string | undefined => {
    for (const attr of ['src', 'data-src']) {
      const v = tag.match(new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, 'i'))?.[1]
      if (v && !v.startsWith('data:')) return v
    }
    const srcset = tag.match(/\bsrcset\s*=\s*["']([^"']+)["']/i)?.[1]
    const first = srcset?.split(',')[0]?.trim().split(/\s+/)[0]
    return first && !first.startsWith('data:') ? first : undefined
  }
  let logo: string | undefined
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/logo/i.test(m[0])) continue
    const src = imgSrc(m[0])
    if (src) {
      logo = src
      break
    }
  }
  if (!logo) logo = html.match(/"logo"\s*:\s*"(https?:\/\/[^"]+)"/i)?.[1]
  if (!logo) {
    const headerBlock = html.match(/<header\b[\s\S]{0,4000}?<\/header>|<nav\b[\s\S]{0,4000}?<\/nav>/i)?.[0]
    const tag = headerBlock?.match(/<img\b[^>]*>/i)?.[0]
    if (tag) logo = imgSrc(tag)
  }
  if (!logo) {
    for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0]
      const rel = tag.match(/rel\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase() ?? ''
      if (!/\b(?:apple-touch-icon|icon|shortcut icon)\b/.test(rel)) continue
      const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
      if (!href || href.startsWith('data:')) continue
      logo = href
      if (rel.includes('apple-touch-icon')) break // best quality — stop looking
    }
  }

  // A usable brand token trumps frequency ranking: it's the site's own
  // declared button color. Near-white tokens are unusable — skip those.
  const primary =
    brandToken && luminance(brandToken) < 0.9 ? brandToken : colors[0]

  return {
    primary,
    colors: colors.slice(0, 8),
    themeColorMeta,
    font,
    pageBackground,
    surface,
    logo,
    buttonRadius,
    pillButtons: pillButtons || undefined,
  }
}

// ── Mapping onto the widget theme ───────────────────────────────────────────

/** Mix a hex color toward white; `amount` 0..1 (1 = white). */
export function tintToward(hex: string, amount: number): string {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
  const mix = (v: number) => Math.round(v + (255 - v) * amount)
  return toHex(mix(r), mix(g), mix(b))
}

/** Mix a hex color toward black; `amount` 0..1 (1 = black). */
export function shadeToward(hex: string, amount: number): string {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((h) => parseInt(h, 16))
  const mix = (v: number) => Math.round(v * (1 - amount))
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
    // Contrast guard: the widget draws light text on the primary (header,
    // send button), so a too-pale brand color is darkened until it can carry it.
    let primary = palette.primary
    for (let i = 0; i < 3 && luminance(primary) > 0.72; i++) {
      primary = shadeToward(primary, 0.18)
    }
    out.primaryColor = primary
    out.launcherColor = primary
  }

  // Shape language: mirror the site's control radii in the widget's corners.
  if (palette.pillButtons || palette.buttonRadius !== undefined) {
    const r = palette.pillButtons ? 999 : palette.buttonRadius!
    if (r < 4) {
      Object.assign(out, { cornerRadius: 6, bubbleRadius: 8, navButtonRadius: 6, headerStyle: 'classic' })
    } else if (r < 10) {
      Object.assign(out, { cornerRadius: 12, bubbleRadius: 14, navButtonRadius: 10, headerStyle: 'classic' })
    } else {
      Object.assign(out, { cornerRadius: 20, bubbleRadius: 18, navButtonRadius: 14, headerStyle: 'curved' })
    }
  }
  if (palette.pageBackground) {
    // The site's own canvas becomes the chat background (and any previously
    // uploaded background photo is cleared — it would fight the site's look).
    out.backgroundColor = palette.pageBackground
    out.backgroundImageUrl = ''
    const dark = luminance(palette.pageBackground) < 0.5
    // Subview/card color → bot bubble; otherwise derive a same-scheme surface.
    out.botBubbleColor =
      palette.surface ??
      (dark ? tintToward(palette.pageBackground, 0.08) : shadeToward(palette.pageBackground, 0.05))
    out.bubbleBorderColor = dark
      ? tintToward(palette.pageBackground, 0.18)
      : shadeToward(palette.pageBackground, 0.12)
  } else if (palette.primary) {
    // No canvas found — fall back to a light on-brand bubble tint.
    out.botBubbleColor = tintToward(palette.primary, 0.92)
  }
  if (palette.font) {
    const matched = matchFontOption(palette.font)
    if (matched) out.fontFamily = matched
  }
  return out
}
