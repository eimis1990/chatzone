/**
 * Curated set of chat fonts a client can choose from in the configurator.
 *
 * Each `stack` references a CSS variable defined by next/font in app/layout.tsx
 * (e.g. `--font-inter`) with a system fallback, so it resolves anywhere inside
 * the app — including the embed iframe, which uses the same root layout.
 *
 * `value` is what we persist in BotConfig.theme.fontFamily.
 */
export interface FontOption {
  value: string
  label: string
  /** CSS font-family value applied inline to the chat container. */
  stack: string
}

export const FONT_OPTIONS: FontOption[] = [
  { value: 'geist', label: 'Geist', stack: 'var(--font-geist-sans), system-ui, sans-serif' },
  { value: 'inter', label: 'Inter', stack: 'var(--font-inter), system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins', stack: 'var(--font-poppins), system-ui, sans-serif' },
  { value: 'nunito', label: 'Nunito', stack: 'var(--font-nunito), system-ui, sans-serif' },
  {
    value: 'jakarta',
    label: 'Plus Jakarta Sans',
    stack: 'var(--font-jakarta), system-ui, sans-serif',
  },
  { value: 'lora', label: 'Lora (serif)', stack: 'var(--font-lora), Georgia, serif' },
]

export const DEFAULT_FONT = 'geist'

/** Resolve a stored font value to its CSS font-family stack (falls back to default). */
export function fontStack(value?: string): string {
  return (FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0]).stack
}
