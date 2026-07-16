/**
 * Mesh-gradient background presets for the chat body.
 *
 * Each preset is a small self-contained SVG (blurred color blobs over a base)
 * encoded as a data: URL and stored in the EXISTING `theme.backgroundImageUrl`
 * field — so the widget, preview, opacity slider, and theme-preset clearing
 * logic all work unchanged. `baseColor` is applied to `theme.backgroundColor`
 * on select: it paints before the SVG loads and drives the widget's dark-body
 * text contrast (isLightColor), so dark gradients get light text.
 */

interface Blob {
  color: string
  cx: number
  cy: number
  r: number
}

function meshDataUrl(base: string, blobs: Blob[]): string {
  const circles = blobs
    .map((b) => `<circle cx='${b.cx}' cy='${b.cy}' r='${b.r}' fill='${b.color}'/>`)
    .join('')
  // Generous filter region so the blur isn't clipped at blob edges.
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 600' preserveAspectRatio='xMidYMid slice'>` +
    `<defs><filter id='b' x='-60%' y='-60%' width='220%' height='220%'><feGaussianBlur stdDeviation='70'/></filter></defs>` +
    `<rect width='400' height='600' fill='${base}'/>` +
    `<g filter='url(#b)'>${circles}</g>` +
    `</svg>`
  // encodeURIComponent leaves ' ( ) literal — they break unquoted CSS url(...)
  // interpolation (the widget's backgroundImage), so escape them too.
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
  return `data:image/svg+xml,${encoded}`
}

export interface WidgetGradientPreset {
  id: string
  name: string
  /** Applied to theme.backgroundColor (pre-image paint + dark-body contrast). */
  baseColor: string
  /** The data: SVG for theme.backgroundImageUrl. */
  url: string
}

function preset(id: string, name: string, base: string, blobs: Blob[]): WidgetGradientPreset {
  return { id, name, baseColor: base, url: meshDataUrl(base, blobs) }
}

export const WIDGET_GRADIENT_PRESETS: WidgetGradientPreset[] = [
  preset('aurora', 'Aurora', '#dff3fe', [
    { color: '#7dd3fc', cx: 60, cy: 90, r: 190 },
    { color: '#6ee7b7', cx: 360, cy: 140, r: 170 },
    { color: '#c4b5fd', cx: 330, cy: 520, r: 200 },
    { color: '#a5f3fc', cx: 50, cy: 500, r: 160 },
  ]),
  preset('sunset', 'Peach Sunset', '#fff1e8', [
    { color: '#fda4af', cx: 70, cy: 100, r: 180 },
    { color: '#fdba74', cx: 360, cy: 170, r: 180 },
    { color: '#f9a8d4', cx: 320, cy: 520, r: 190 },
    { color: '#fecdd3', cx: 40, cy: 520, r: 160 },
  ]),
  preset('lavender', 'Lavender Haze', '#f5f0ff', [
    { color: '#d8b4fe', cx: 80, cy: 110, r: 180 },
    { color: '#a5b4fc', cx: 350, cy: 90, r: 170 },
    { color: '#f0abfc', cx: 340, cy: 510, r: 190 },
    { color: '#e9d5ff', cx: 60, cy: 520, r: 170 },
  ]),
  preset('ocean', 'Ocean Breeze', '#eafcff', [
    { color: '#67e8f9', cx: 70, cy: 90, r: 180 },
    { color: '#38bdf8', cx: 350, cy: 160, r: 180 },
    { color: '#818cf8', cx: 320, cy: 520, r: 190 },
    { color: '#a7f3d0', cx: 50, cy: 510, r: 160 },
  ]),
  preset('meadow', 'Sage Meadow', '#f2fdf5', [
    { color: '#86efac', cx: 70, cy: 100, r: 180 },
    { color: '#fde68a', cx: 350, cy: 130, r: 170 },
    { color: '#a7f3d0', cx: 330, cy: 520, r: 190 },
    { color: '#bbf7d0', cx: 50, cy: 510, r: 160 },
  ]),
  preset('candy', 'Candy Pop', '#fdf2f8', [
    { color: '#f9a8d4', cx: 80, cy: 100, r: 180 },
    { color: '#c4b5fd', cx: 350, cy: 150, r: 180 },
    { color: '#fda4af', cx: 330, cy: 520, r: 190 },
    { color: '#fbcfe8', cx: 50, cy: 520, r: 160 },
  ]),
  preset('dusk', 'Dusk', '#312e81', [
    { color: '#6366f1', cx: 70, cy: 100, r: 190 },
    { color: '#7e22ce', cx: 350, cy: 160, r: 180 },
    { color: '#0ea5e9', cx: 320, cy: 520, r: 190 },
    { color: '#4338ca', cx: 50, cy: 510, r: 170 },
  ]),
  preset('midnight', 'Midnight Ember', '#0f172a', [
    { color: '#475569', cx: 70, cy: 90, r: 180 },
    { color: '#6d28d9', cx: 350, cy: 170, r: 180 },
    { color: '#be185d', cx: 320, cy: 520, r: 180 },
    { color: '#1e40af', cx: 50, cy: 510, r: 170 },
  ]),

  // ── Subtle lights — near-white bases, 2-3 gentle tints ──────────────────────
  preset('mist', 'Morning Mist', '#fafcff', [
    { color: '#dbeafe', cx: 90, cy: 120, r: 230 },
    { color: '#ede9fe', cx: 330, cy: 500, r: 240 },
  ]),
  preset('linen', 'Warm Linen', '#fffcf7', [
    { color: '#ffedd5', cx: 320, cy: 110, r: 230 },
    { color: '#fee2e2', cx: 80, cy: 510, r: 240 },
  ]),
  preset('pearl', 'Pearl Rose', '#fffafb', [
    { color: '#ffe4e6', cx: 90, cy: 100, r: 220 },
    { color: '#fae8ff', cx: 330, cy: 320, r: 210 },
    { color: '#ffe4e6', cx: 100, cy: 540, r: 200 },
  ]),
  preset('mint', 'Fresh Mint', '#f8fefb', [
    { color: '#d1fae5', cx: 100, cy: 130, r: 230 },
    { color: '#e0f2fe', cx: 320, cy: 490, r: 240 },
  ]),
  preset('vanilla', 'Vanilla Sky', '#fffdf5', [
    { color: '#fef3c7', cx: 310, cy: 120, r: 230 },
    { color: '#fce7f3', cx: 90, cy: 480, r: 230 },
  ]),
  preset('cloud', 'Soft Cloud', '#fbfbfd', [
    { color: '#e5e7eb', cx: 90, cy: 110, r: 220 },
    { color: '#e0e7ff', cx: 330, cy: 340, r: 210 },
    { color: '#e5e7eb', cx: 110, cy: 550, r: 200 },
  ]),

  // ── Deep darks — near-black bases, 2-3 muted glows ──────────────────────────
  preset('obsidian', 'Obsidian', '#09090b', [
    { color: '#27272a', cx: 100, cy: 120, r: 230 },
    { color: '#3f3f46', cx: 320, cy: 500, r: 220 },
  ]),
  preset('abyss', 'Deep Abyss', '#020617', [
    { color: '#1e3a8a', cx: 90, cy: 130, r: 220 },
    { color: '#0e7490', cx: 330, cy: 490, r: 220 },
  ]),
  preset('nocturne', 'Nocturne', '#0c0a1d', [
    { color: '#4c1d95', cx: 320, cy: 110, r: 220 },
    { color: '#1e1b4b', cx: 90, cy: 500, r: 240 },
  ]),
  preset('charcoal-ember', 'Charcoal Ember', '#0c0a09', [
    { color: '#7c2d12', cx: 100, cy: 120, r: 210 },
    { color: '#422006', cx: 320, cy: 340, r: 200 },
    { color: '#7c2d12', cx: 110, cy: 550, r: 190 },
  ]),
  preset('night-forest', 'Night Forest', '#04120c', [
    { color: '#064e3b', cx: 320, cy: 130, r: 220 },
    { color: '#14532d', cx: 90, cy: 500, r: 230 },
  ]),
  preset('black-plum', 'Black Plum', '#100510', [
    { color: '#581c87', cx: 90, cy: 120, r: 210 },
    { color: '#831843', cx: 330, cy: 500, r: 210 },
  ]),
]
