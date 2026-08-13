import { createServiceClient } from '@/lib/supabase/service'
import { hashDemoShareToken, isDemoShareToken } from '@/lib/demo-share-token'
import type { Bot } from '@/lib/types'

/**
 * Bot lookups for the presentation stage, shared by the two present pages and
 * the backdrop proxy so the "must be a demo-org bot" check cannot drift apart
 * between them.
 *
 * These do NOT authenticate — `getDemoBot` assumes the caller already proved
 * the owner role (`requireRole('owner')` on pages, a session check in routes).
 * `getDemoBotByShareToken` is self-authorizing: the token *is* the credential.
 */

export type PresentBot = Pick<Bot, 'id' | 'name' | 'public_key' | 'config'>

const COLUMNS = 'id, name, public_key, config'

/** Owner-gated lookup. Returns null for anything outside a demo organization. */
export async function getDemoBot(botId: string): Promise<PresentBot | null> {
  const { data } = await createServiceClient()
    .from('bots')
    .select(`${COLUMNS}, organizations!inner(is_demo)`)
    .eq('id', botId)
    .eq('organizations.is_demo', true)
    .maybeSingle<PresentBot>()
  return data ?? null
}

/**
 * Bearer-link lookup. Rechecks expiry, revocation, and — critically — that the
 * bot is *currently* in a demo org, so a live token stops working the moment
 * its bot is transferred to a real client.
 */
export async function getDemoBotByShareToken(token: string): Promise<PresentBot | null> {
  if (!isDemoShareToken(token)) return null

  const svc = createServiceClient()
  const { data: share } = await svc
    .from('demo_presentation_shares')
    .select('bot_id')
    .eq('token_hash', hashDemoShareToken(token))
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle<{ bot_id: string }>()
  if (!share) return null

  return getDemoBot(share.bot_id)
}

/** The site used as the presentation backdrop, if the bot has one configured. */
export function presentSiteUrl(bot: PresentBot): string | undefined {
  return bot.config.websiteUrl || bot.config.commerce?.storeUrl
}
