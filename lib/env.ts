import { z } from 'zod'

/**
 * Environment contract for the whole app.
 *
 * `parseEnv` is pure and testable. `getEnv` memoizes a validated view of
 * `process.env` and is for SERVER code only — it includes the service-role key,
 * which must never reach the browser bundle. Client components read the
 * `NEXT_PUBLIC_*` values directly (see lib/supabase/browser.ts).
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(source)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Invalid or missing environment variables: ${fields}`)
  }
  return parsed.data
}

let cached: Env | null = null

/** Server-only. Throws at first access if the environment is misconfigured. */
export function getEnv(): Env {
  if (!cached) cached = parseEnv(process.env)
  return cached
}
