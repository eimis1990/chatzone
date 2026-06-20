import { createServerClient as createSsrClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getEnv } from '@/lib/env'

/**
 * Cookie-bound Supabase client for Server Components, Route Handlers, and
 * Server Actions. Respects the signed-in user's session and RLS.
 */
export async function createServerClient() {
  const env = getEnv()
  const cookieStore = await cookies()

  return createSsrClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component where setting cookies is not
            // allowed; session refresh is handled by middleware instead.
          }
        },
      },
    },
  )
}
