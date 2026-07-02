import { PRESET_PRESERVED_THEME_KEYS } from '@/lib/widget-theme-presets'

/**
 * Pure helpers for the client onboarding wizard (/app/onboarding).
 * No server or React imports — unit-tested in tests/unit/onboarding.test.ts.
 */

export type BusinessTypeId = 'ecommerce' | 'service' | 'clinic' | 'b2b' | 'general'

export interface BusinessType {
  id: BusinessTypeId
  label: string
  description: string
  /**
   * Exact `system_prompts.name` of the owner-managed template to copy into the
   * new bot's config. `null` = keep defaultBotConfig's generic prompt.
   */
  templateName: string | null
}

/**
 * The business-type picker cards (step 1). The four template names MUST match
 * the owner's prompt-library rows exactly — the server action looks them up
 * by name via the service client (the table is owner-only under RLS).
 */
export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'ecommerce',
    label: 'E-Commerce Store',
    description: 'You sell products online — the bot can answer shipping, returns, and product questions.',
    templateName: 'E-Commerce Store',
  },
  {
    id: 'service',
    label: 'Service Business',
    description: 'Salons, repairs, trades — the bot handles bookings, pricing, and availability questions.',
    templateName: 'Service Business',
  },
  {
    id: 'clinic',
    label: 'Clinic & Health Services',
    description: 'Clinics and practices — appointments, services, and preparation info, handled carefully.',
    templateName: 'Clinic & Health Services',
  },
  {
    id: 'b2b',
    label: 'Professional Services & B2B',
    description: 'Agencies, consultancies, software — the bot qualifies leads and explains your offering.',
    templateName: 'Professional Services & B2B',
  },
  {
    id: 'general',
    label: 'General / Other',
    description: 'Anything else — start with a solid general-purpose assistant prompt.',
    templateName: null,
  },
]

/** Type guard for the business-type picker value. */
export function isBusinessTypeId(value: unknown): value is BusinessTypeId {
  return typeof value === 'string' && BUSINESS_TYPES.some((t) => t.id === value)
}

/** Template row name for a business type (`null` = use the default prompt). */
export function templateNameFor(businessType: string): string | null {
  return BUSINESS_TYPES.find((t) => t.id === businessType)?.templateName ?? null
}

/**
 * Normalize a user-typed website URL the way people actually type them
 * ("mystore.lt" → "https://mystore.lt"). Returns `null` when the value can't
 * be a public http(s) URL (empty, unparseable, wrong scheme, no dot in host).
 */
export function normalizeWebsiteUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const url = new URL(withProtocol)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (!url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

/**
 * Merge a preset / "match my website" partial into the wizard's theme state,
 * skipping preserved functional keys (position, uploaded images, toggles…)
 * and undefined values — the same contract as the configurator's preset picker.
 */
export function mergeVisualTheme<T extends Record<string, unknown>>(
  current: T,
  partial: Record<string, unknown>,
): T {
  const preserved = PRESET_PRESERVED_THEME_KEYS as readonly string[]
  const next: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(partial)) {
    if (preserved.includes(key) || value === undefined) continue
    next[key] = value
  }
  return next as T
}
