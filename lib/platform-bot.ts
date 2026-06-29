import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'
import { defaultBotConfig } from '@/lib/validation/schemas'
import type { Bot, BotConfig } from '@/lib/types'

export interface PlatformBot {
  id: string
  name: string
  config: BotConfig
  public_key: string
  show_on_landing: boolean
  org_id: string
}

const BOT_COLS = 'id, name, config, public_key, show_on_landing, org_id'

/**
 * Loqara's own bot — the one dogfooded on the marketing landing page. Lives in
 * the single `is_platform` org. Find-or-create so the owner can just open
 * /owner/chatbot and start configuring (no manual seeding). Idempotent.
 */
export async function getOrCreatePlatformBot(): Promise<PlatformBot> {
  const svc = createServiceClient()

  let { data: org } = await svc
    .from('organizations')
    .select('id')
    .eq('is_platform', true)
    .maybeSingle<{ id: string }>()

  if (!org) {
    const { data, error } = await svc
      .from('organizations')
      // Enterprise + voice so the config form exposes every feature for our own bot.
      .insert({ name: 'Loqara', slug: 'loqara', plan: 'enterprise', voice_addon: true, is_platform: true })
      .select('id')
      .single<{ id: string }>()
    if (error || !data) throw new Error(`Failed to create platform org: ${error?.message}`)
    org = data
  }

  let { data: bot } = await svc
    .from('bots')
    .select(BOT_COLS)
    .eq('org_id', org.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<PlatformBot>()

  if (!bot) {
    const { data, error } = await svc
      .from('bots')
      .insert({ org_id: org.id, name: 'Loqara', config: defaultBotConfig('Loqara') as Bot['config'] })
      .select(BOT_COLS)
      .single<PlatformBot>()
    if (error || !data) throw new Error(`Failed to create platform bot: ${error?.message}`)
    bot = data
  }

  return bot
}

/**
 * Public key of the landing bot iff the owner has toggled it on — else null.
 * Resilient: never throws (returns null) so a build-time/runtime DB hiccup can't
 * break the public landing page render.
 */
export async function getLandingBotKey(): Promise<string | null> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('bots')
      .select('public_key')
      .eq('show_on_landing', true)
      .limit(1)
      .maybeSingle<{ public_key: string }>()
    return data?.public_key ?? null
  } catch {
    return null
  }
}
