import { createServiceClient } from '@/lib/supabase/service'
import { isOriginAllowed, corsHeaders } from '@/lib/widget-auth'
import { publicBotConfig } from '@/lib/widget-config'
import type { Bot } from '@/lib/types'

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

  return json(publicBotConfig(bot.config))
}
