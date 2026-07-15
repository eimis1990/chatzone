/**
 * Curated, open-source Google Fonts available to the chat configurator.
 *
 * Each stack references a CSS variable declared through next/font in
 * app/layout.tsx. Optional families use preload:false there, so expanding the
 * catalog does not preload every font on every page.
 */
export type FontCategory = 'business' | 'friendly' | 'serif' | 'mono'

export interface FontOption {
  value: string
  label: string
  category: FontCategory
  /** CSS font-family value applied inline to the chat container. */
  stack: string
}

export interface FontGroup {
  value: FontCategory
  label: string
  description: string
  fonts: FontOption[]
}

const font = (
  value: string,
  label: string,
  category: FontCategory,
  variable: string,
  fallback = 'system-ui, sans-serif',
): FontOption => ({ value, label, category, stack: `var(${variable}), ${fallback}` })

export const FONT_GROUPS: FontGroup[] = [
  {
    value: 'business',
    label: 'Modern & business',
    description: 'Clean, neutral, and highly readable',
    fonts: [
      font('geist', 'Geist', 'business', '--font-geist-sans'),
      font('inter', 'Inter', 'business', '--font-inter'),
      font('urbanist', 'Urbanist', 'business', '--font-urbanist'),
      font('manrope', 'Manrope', 'business', '--font-manrope'),
      font('dm-sans', 'DM Sans', 'business', '--font-dm-sans'),
      font('jakarta', 'Plus Jakarta Sans', 'business', '--font-jakarta'),
      font('ibm-plex-sans', 'IBM Plex Sans', 'business', '--font-ibm-plex-sans'),
      font('work-sans', 'Work Sans', 'business', '--font-work-sans'),
    ],
  },
  {
    value: 'friendly',
    label: 'Friendly & playful',
    description: 'Softer shapes with more personality',
    fonts: [
      font('poppins', 'Poppins', 'friendly', '--font-poppins'),
      font('nunito', 'Nunito', 'friendly', '--font-nunito'),
      font('quicksand', 'Quicksand', 'friendly', '--font-quicksand'),
      font('fredoka', 'Fredoka', 'friendly', '--font-fredoka'),
      font('baloo', 'Baloo 2', 'friendly', '--font-baloo'),
      font('dynapuff', 'DynaPuff', 'friendly', '--font-dynapuff'),
      font('mali', 'Mali', 'friendly', '--font-mali'),
      font('atma', 'Atma', 'friendly', '--font-atma'),
    ],
  },
  {
    value: 'serif',
    label: 'Serif & editorial',
    description: 'Classic, trustworthy, and expressive',
    fonts: [
      font('lora', 'Lora', 'serif', '--font-lora', 'Georgia, serif'),
      font('merriweather', 'Merriweather', 'serif', '--font-merriweather', 'Georgia, serif'),
      font('playfair', 'Playfair Display', 'serif', '--font-playfair', 'Georgia, serif'),
      font('source-serif', 'Source Serif 4', 'serif', '--font-source-serif', 'Georgia, serif'),
    ],
  },
  {
    value: 'mono',
    label: 'Monospace',
    description: 'Technical, structured, and distinctive',
    fonts: [
      font('geist-mono', 'Geist Mono', 'mono', '--font-geist-mono', 'ui-monospace, monospace'),
      font('ibm-plex-mono', 'IBM Plex Mono', 'mono', '--font-ibm-plex-mono', 'ui-monospace, monospace'),
      font('jetbrains-mono', 'JetBrains Mono', 'mono', '--font-jetbrains-mono', 'ui-monospace, monospace'),
      font('roboto-mono', 'Roboto Mono', 'mono', '--font-roboto-mono', 'ui-monospace, monospace'),
    ],
  },
]

export const FONT_OPTIONS = FONT_GROUPS.flatMap((group) => group.fonts)
export const DEFAULT_FONT = 'geist'
export const DEFAULT_FONT_WEIGHT = 400
export const FONT_WEIGHTS = [400, 500, 600, 700] as const

/** Resolve a stored font value to its CSS font-family stack (falls back to default). */
export function fontStack(value?: string): string {
  return (FONT_OPTIONS.find((option) => option.value === value) ?? FONT_OPTIONS[0]).stack
}
