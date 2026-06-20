import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

/**
 * Service-role Supabase client. BYPASSES Row-Level Security — use only on the
 * server for trusted, explicitly-scoped operations (e.g. the public widget
 * endpoints, which scope every query to a single bot_id themselves).
 *
 * The `server-only` import makes importing this from a Client Component a
 * build error, so the service-role key can never leak into the browser.
 */
export function createServiceClient() {
  const env = getEnv()
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
