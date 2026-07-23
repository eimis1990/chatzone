import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { publicBotConfig } from '@/lib/widget-config'
import { entitlementsFor } from '@/lib/entitlements'
import { VISUALIZER_ADDON } from '@/lib/plans-catalog'
import { visualizerUsageMonth } from '@/lib/room-visualizer'
import type { Bot, Plan } from '@/lib/types'

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  })
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin')
  const cors = corsHeaders(origin)

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  const { searchParams } = new URL(req.url)
  const key = searchParams.get('key')

  if (!key) return json({ error: 'Missing key parameter' }, 400)

  const svc = createServiceClient()

  const { data: bot } = await svc
    .from('bots')
    .select('*')
    .eq('public_key', key)
    .single<Bot>()

  if (!bot || bot.status !== 'active') {
    return json({ error: 'Bot not found' }, 404)
  }

  if (!isOriginAllowed(origin, bot.config.allowedDomains ?? [])) {
    return json({ error: 'Origin not allowed' }, 403)
  }

  // Apply plan entitlements (language limit / lead capture / badge) + the Voice
  // add-on for the org.
  const { data: org } = await svc
    .from('organizations')
    .select('plan, voice_addon, is_demo, visualizer_addon')
    .eq('id', bot.org_id)
    .single<{
      plan: Plan | null
      voice_addon: boolean | null
      is_demo: boolean | null
      visualizer_addon: boolean | null
    }>()
  const entitlements = entitlementsFor(org?.plan ?? 'free')

  // Room visualizer: needs the paid add-on (owner demo orgs are exempt), and
  // hides quietly for the rest of the month once the render pool is spent —
  // the tray simply doesn't appear, visitors never see an error.
  if (bot.config.roomVisualizer) {
    const allowed = Boolean(org?.is_demo || org?.visualizer_addon)
    let poolLeft = true
    if (allowed && !org?.is_demo) {
      const { data: usage } = await svc
        .from('visualizer_usage')
        .select('renders')
        .eq('org_id', bot.org_id)
        .eq('month', visualizerUsageMonth())
        .maybeSingle<{ renders: number }>()
      poolLeft = (usage?.renders ?? 0) < VISUALIZER_ADDON.rendersIncluded
    }
    if (!allowed || !poolLeft) bot.config.roomVisualizer = false
  }

  // Stamp "last seen" so the owner can tell this bot is embedded & live. The
  // row is already loaded, so we only write when it's stale (≤ every 10 min).
  const lastSeen = bot.last_seen_at ? new Date(bot.last_seen_at).getTime() : 0
  if (Date.now() - lastSeen > 10 * 60 * 1000) {
    await svc.from('bots').update({ last_seen_at: new Date().toISOString() }).eq('id', bot.id)
  }

  return json(publicBotConfig(bot.config, entitlements, Boolean(org?.voice_addon)))
}
