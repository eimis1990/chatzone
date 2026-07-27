import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommerceProvider } from '@/lib/commerce/types'

/** Folder ids = every commerce provider + 'core' (provider-independent). */
export const CORE_FOLDER = 'core'

/**
 * Components assigned to a bot's provider folder + the core folder. Called
 * with the service client from chat/widget-config routes; a missing table row
 * means the component is NOT available (folders can only narrow what code
 * capabilities already allow).
 */
export async function assignedComponents(
  svc: SupabaseClient,
  provider: CommerceProvider | null | undefined,
): Promise<Set<string>> {
  const folders = provider ? [provider, CORE_FOLDER] : [CORE_FOLDER]
  const { data, error } = await svc
    .from('provider_components')
    .select('component_key')
    .in('provider', folders)
  // Fail open: an availability-read hiccup must not strip components from live
  // widgets mid-conversation. ponytail: no caching — two small reads per chat
  // request; add an in-memory TTL cache if this ever shows up in latency.
  if (error) return new Set(['product-cards', 'order-status', 'lead-form', 'room-visualizer'])
  return new Set((data ?? []).map((r) => r.component_key as string))
}
