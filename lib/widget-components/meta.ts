/**
 * Widget component library — server-safe metadata (no React imports).
 * Rendered previews live in ./registry.tsx ('use client').
 *
 * Owner assigns components to provider folders (provider_components table);
 * each bot picks a VARIANT via config.components[key]. Variants are parallel
 * alternatives, not a version timeline. Adding a component/variant here (and a
 * preview in registry.tsx) makes it appear in every screen automatically.
 */

export interface WidgetComponentVariantMeta {
  id: string
  name: string
  description: string
}

export interface WidgetComponentMeta {
  key: string
  name: string
  description: string
  /** Provider-independent — lives in the Core folder, applies to all bots. */
  core?: boolean
  variants: WidgetComponentVariantMeta[]
}

export const WIDGET_COMPONENTS: WidgetComponentMeta[] = [
  {
    key: 'product-cards',
    name: 'Product cards',
    description: 'Products the assistant found, shown as cards inside the conversation.',
    variants: [
      {
        id: 'default',
        name: 'Image cards',
        description: 'Large swipeable cards with photos and a call-to-action button.',
      },
      {
        id: 'compact',
        name: 'Compact rows',
        description: 'Space-saving stacked rows with a small thumbnail — the whole row links out.',
      },
    ],
  },
  {
    key: 'order-status',
    name: 'Order status card',
    description: 'Live order lookup result: status badge, items, total, tracking.',
    variants: [
      { id: 'default', name: 'Standard', description: 'Header with status badge, item list and totals.' },
      {
        id: 'timeline',
        name: 'Delivery timeline',
        description: 'Adds a progress stepper — Ordered → Processing → Shipped → Delivered.',
      },
    ],
  },
  {
    key: 'lead-form',
    name: 'Lead capture form',
    description: 'In-chat form that collects the visitor’s contact details.',
    core: true,
    variants: [
      { id: 'default', name: 'Standard', description: 'Name + email form with a dismiss link.' },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Frameless pill inputs labelled by placeholder — quieter, blends into the chat.',
      },
    ],
  },
  {
    key: 'room-visualizer',
    name: 'Room visualizer',
    description: '“See it in your room” — visitors combine products into an AI room render.',
    core: true,
    variants: [
      {
        id: 'default',
        name: 'Standard',
        description: 'Bold brand-colored tray above the composer plus the render studio.',
      },
      {
        id: 'subtle',
        name: 'Subtle',
        description: 'Quiet white tray with an accent button — for brands that want less color.',
      },
    ],
  },
]

export function componentMeta(key: string): WidgetComponentMeta | undefined {
  return WIDGET_COMPONENTS.find((c) => c.key === key)
}

/** The variant a bot renders for a component — unknown ids fall back to the first variant. */
export function variantIdFor(key: string, variantId?: string): string | undefined {
  const meta = componentMeta(key)
  if (!meta) return undefined
  return (meta.variants.find((v) => v.id === variantId) ?? meta.variants[0])?.id
}
