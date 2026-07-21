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
 * Make the owner a member of the platform org so the knowledge upload / ingest
 * flows (which are RLS-scoped to the signed-in user's org membership via the
 * browser client) work for the platform bot. Idempotent.
 */
export async function ensurePlatformMembership(orgId: string, userId: string): Promise<void> {
  const svc = createServiceClient()
  const { data: existing } = await svc
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing) return
  await svc.from('organization_members').insert({ org_id: orgId, user_id: userId, role: 'admin' })
}

/**
 * Public key of the landing bot iff the owner has toggled it on — else null.
 * Resilient: never throws (returns null) so a build-time/runtime DB hiccup can't
 * break the public landing page render.
 */
export async function getLandingBotKey(): Promise<string | null> {
  return (await getLandingBot())?.key ?? null
}

/**
 * What the deferred landing proxy launcher must look like to be
 * indistinguishable from the real widget.js launcher it stands in for
 * (same fallback chain as widget.js renderLauncher()).
 */
export interface LandingLauncherTheme {
  color: string
  iconColor: string
  /** LAUNCHER_ICONS key (lib/launcher-icons.ts). */
  icon: string
  /** Px from the viewport edges (widget.js OFFSET default: 20). */
  bottom: number
  side: number
}

/** Mirror of widget.js readable(): dark text on light launcher colors. */
function readableTextColor(hex: string): string {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length !== 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111827' : '#ffffff'
}

/** Landing bot's public key + the launcher theme for the deferred proxy button. */
export async function getLandingBot(): Promise<{ key: string; launcher: LandingLauncherTheme } | null> {
  try {
    const svc = createServiceClient()
    const { data } = await svc
      .from('bots')
      .select('public_key, config')
      .eq('show_on_landing', true)
      .limit(1)
      .maybeSingle<{ public_key: string; config: BotConfig }>()
    if (!data) return null
    const theme = data.config.theme ?? {}
    const color = theme.launcherColor || theme.primaryColor || '#6366f1'
    return {
      key: data.public_key,
      launcher: {
        color,
        iconColor: theme.launcherIconColor || readableTextColor(color),
        icon: theme.launcherIcon ?? 'chat',
        bottom: theme.launcherBottomSpacing ?? 20,
        side: theme.launcherSideSpacing ?? 20,
      },
    }
  } catch {
    return null
  }
}
