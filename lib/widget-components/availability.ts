import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommerceProvider } from '@/lib/commerce/types'
import { WIDGET_COMPONENTS } from './meta'

/** Folder ids = every commerce provider + 'core' (provider-independent). */
export const CORE_FOLDER = 'core'

/**
 * Variant-level availability for a bot's provider folder + core:
 * component key → the set of variant ids the owner assigned. A component with
 * no rows is NOT available (folders can only narrow code capabilities).
 *
 * Fails open (every component, every variant) on read errors — an
 * availability-read hiccup must not strip components from live widgets.
 * ponytail: no caching — one small read per chat request; add an in-memory TTL
 * cache if this ever shows up in latency.
 */
export async function assignedComponentVariants(
  svc: SupabaseClient,
  provider: CommerceProvider | null | undefined,
): Promise<Map<string, Set<string>>> {
  const folders = provider ? [provider, CORE_FOLDER] : [CORE_FOLDER]
  const { data, error } = await svc
    .from('provider_components')
    .select('component_key, variant_id')
    .in('provider', folders)
  if (error) {
    return new Map(WIDGET_COMPONENTS.map((c) => [c.key, new Set(c.variants.map((v) => v.id))]))
  }
  const map = new Map<string, Set<string>>()
  for (const r of data ?? []) {
    const key = r.component_key as string
    ;(map.get(key) ?? map.set(key, new Set()).get(key)!).add((r.variant_id as string) ?? 'default')
  }
  return map
}

/** Component keys available to a provider (any variant assigned). */
export async function assignedComponents(
  svc: SupabaseClient,
  provider: CommerceProvider | null | undefined,
): Promise<Set<string>> {
  return new Set((await assignedComponentVariants(svc, provider)).keys())
}
