import { createBrowserClient as createSsrBrowserClient } from '@supabase/ssr'

/**
 * Supabase client for Client Components. Reads only the public anon key —
 * never the service-role key — so it is safe to ship in the browser bundle.
 */
export function createBrowserClient() {
  return createSsrBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
