import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Edge-safe read of the shared custom-LLM bearer token.
 *
 * Kept separate from `elevenlabs-agent.ts` (which imports `node:crypto` for
 * token/secret *creation*) so the Edge-runtime `/api/llm` route can verify the
 * token without pulling Node-only APIs into the Edge bundle.
 */
export const LLM_TOKEN_SETTING = 'cbz_llm_token'

/** The shared custom-LLM bearer token (for the /api/llm endpoint to verify). */
export async function getLlmToken(db: SupabaseClient): Promise<string | null> {
  const { data } = await db
    .from('platform_settings')
    .select('value')
    .eq('key', LLM_TOKEN_SETTING)
    .single()
  return (data?.value as string) ?? null
}
