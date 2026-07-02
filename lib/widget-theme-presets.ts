import type { z } from 'zod'
import type { botConfigFormSchema } from '@/lib/validation/schemas'

/**
 * Curated widget theme presets — one-click starting points for the Appearance
 * section of the configurator. Each preset is a complete BotConfig.theme value
 * (validated against the zod theme sub-schema in tests/unit/theme-presets.test.ts).
 *
 * Applying a preset overrides the *look* only: keys listed in
 * PRESET_PRESERVED_THEME_KEYS (position, uploaded images, launcher text/logo,
 * feature toggles) are never touched, so a preset restyles the widget without
 * clobbering functional choices the user already made.
 */
export type WidgetTheme = z.infer<typeof botConfigFormSchema>['theme']

export interface WidgetThemePreset {
  id: string
  name: string
  description: string
  theme: WidgetTheme
}

/** Theme keys a preset (or theme-from-URL) must never override. */
export const PRESET_PRESERVED_THEME_KEYS = [
  'position',
  'bubbleIcon',
  'launcherLabel',
  'launcherShowLogo',
  'showCallButton',
  'showHandoffButton',
  'backgroundImageUrl',
  'backgroundImageOpacity',
  'sendIconUrl',
] as const

// Shared functional defaults — presets only vary the visual fields.
const base = {
  position: 'bottom-right',
  launcherStyle: 'circle',
  launcherShowLogo: false,
  showCallButton: true,
  showHandoffButton: true,
  backgroundImageOpacity: 100,
  callButtonColor: '',
} as const satisfies Partial<WidgetTheme>

export const WIDGET_THEME_PRESETS: WidgetThemePreset[] = [
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    description: 'Clean monochrome on white — quiet, editorial, lets your content lead.',
    theme: {
      ...base,
      primaryColor: '#18181b',
      launcherColor: '#18181b',
      botBubbleColor: '#f4f4f5',
      backgroundColor: '#ffffff',
      bubbleBorderColor: '#e4e4e7',
      bubbleBorderWidth: 1,
      cornerRadius: 12,
      bubbleRadius: 10,
      navButtonRadius: 10,
      glassBubbles: false,
      fontFamily: 'inter',
    },
  },
  {
    id: 'midnight-dark',
    name: 'Midnight Dark',
    description: 'Deep navy chat with an indigo accent — a true dark mode.',
    theme: {
      ...base,
      primaryColor: '#6366f1',
      launcherColor: '#6366f1',
      botBubbleColor: '#1e293b',
      backgroundColor: '#0b1120',
      bubbleBorderColor: '#334155',
      bubbleBorderWidth: 1,
      cornerRadius: 16,
      bubbleRadius: 14,
      navButtonRadius: 12,
      glassBubbles: false,
      fontFamily: 'geist',
    },
  },
  {
    id: 'frosted-glass',
    name: 'Frosted Glass',
    description: 'Translucent, blurred bubbles over a dark slate backdrop.',
    theme: {
      ...base,
      primaryColor: '#0ea5e9',
      launcherColor: '#0ea5e9',
      botBubbleColor: '',
      backgroundColor: '#0f172a',
      bubbleBorderColor: '#94a3b8',
      bubbleBorderWidth: 0,
      cornerRadius: 20,
      bubbleRadius: 18,
      navButtonRadius: 14,
      glassBubbles: true,
      fontFamily: 'jakarta',
    },
  },
  {
    id: 'warm-boutique',
    name: 'Warm Boutique',
    description: 'Cream background, terracotta accent, and a serif face — cosy retail.',
    theme: {
      ...base,
      primaryColor: '#9a3412',
      launcherColor: '#9a3412',
      botBubbleColor: '#f6ede3',
      backgroundColor: '#fffbf5',
      bubbleBorderColor: '#ead9c9',
      bubbleBorderWidth: 1,
      cornerRadius: 18,
      bubbleRadius: 16,
      navButtonRadius: 14,
      glassBubbles: false,
      fontFamily: 'lora',
    },
  },
  {
    id: 'corporate-blue',
    name: 'Corporate Blue',
    description: 'Classic enterprise blue with square-ish corners — safe and familiar.',
    theme: {
      ...base,
      primaryColor: '#1d4ed8',
      launcherColor: '#1d4ed8',
      botBubbleColor: '#eff6ff',
      backgroundColor: '#ffffff',
      bubbleBorderColor: '#dbeafe',
      bubbleBorderWidth: 1,
      cornerRadius: 8,
      bubbleRadius: 8,
      navButtonRadius: 8,
      glassBubbles: false,
      fontFamily: 'inter',
    },
  },
  {
    id: 'playful',
    name: 'Playful',
    description: 'Pink pop, extra-round bubbles, and Poppins — friendly and fun.',
    theme: {
      ...base,
      primaryColor: '#db2777',
      launcherColor: '#db2777',
      botBubbleColor: '#fce7f3',
      backgroundColor: '#fdf7fb',
      bubbleBorderColor: '#fbcfe8',
      bubbleBorderWidth: 0,
      cornerRadius: 24,
      bubbleRadius: 22,
      navButtonRadius: 18,
      glassBubbles: false,
      fontFamily: 'poppins',
    },
  },
]
