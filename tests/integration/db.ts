import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

/** True only when a real Supabase project is configured (via .env.local). */
export const hasDbEnv = Boolean(url && anon && service)

export function serviceClient(): SupabaseClient {
  return createClient(url!, service!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** A fresh anon client signed in as the given user (carries that user's JWT). */
export async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(url!, anon!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return client
}

export function anonClient(): SupabaseClient {
  return createClient(url!, anon!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
