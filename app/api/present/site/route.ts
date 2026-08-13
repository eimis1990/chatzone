import type { NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/auth/guards'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { getDemoBot, getDemoBotByShareToken, presentSiteUrl } from '@/lib/demo/present-bot'
import {
  findSpriteUrls,
  presentProxyPrefix,
  PRESENT_FETCH_USER_AGENT,
  rewritePresentHtml,
  type PresentRef,
} from '@/lib/demo/present-proxy'

/**
 * Backdrop proxy for the demo presentation stage: re-serves a demo bot's
 * configured website from our origin, minus the `X-Frame-Options` /
 * `frame-ancestors` headers that stop the stage from framing it. That turns the
 * backdrop from a flat screenshot into a page you can actually scroll on stage.
 *
 * NOT an open proxy: the caller passes a bot id (owner session required) or a
 * share token, never a URL. The target comes from the bot's own config, so the
 * only pages reachable here are ones an owner already configured on a demo bot.
 *
 * The framing side sandboxes this document to an opaque origin — see
 * `components/demo/DemoPresentationStage.tsx`.
 */

export const maxDuration = 30

const MAX_BYTES = 4_000_000
const MAX_SPRITES = 3
const MAX_SPRITE_BYTES = 400_000

function notFound() {
  return new Response('Not found', { status: 404 })
}

/**
 * Fetch the page's SVG sprite files so they can be inlined. An icon sprite is
 * unreachable from the sandboxed frame's opaque origin, and a page missing all
 * 200-odd of its icons looks broken on stage. Best-effort: a sprite we can't
 * fetch simply stays missing.
 */
async function fetchSprites(html: string, origin: string): Promise<Map<string, string>> {
  const sprites = new Map<string, string>()
  for (const url of findSpriteUrls(html, origin).slice(0, MAX_SPRITES)) {
    try {
      await assertPublicUrl(url)
      const res = await fetch(url, {
        headers: { 'user-agent': PRESENT_FETCH_USER_AGENT, accept: 'image/svg+xml' },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok || !/svg/i.test(res.headers.get('content-type') ?? '')) continue
      const svg = (await res.text()).slice(0, MAX_SPRITE_BYTES)
      // Only the <svg> element itself; an XML prolog would be invalid inline.
      const match = svg.match(/<svg[\s\S]*<\/svg>/i)
      if (match) sprites.set(url, match[0])
    } catch {
      // unreachable sprite — icons from it stay missing
    }
  }
  return sprites
}

/**
 * Resolve the request path against the backdrop origin, rejecting escapes.
 * With no path, the configured URL is used as-is — a `websiteUrl` of
 * `https://site.com/lt/` must open that page, not the bare origin.
 */
function resolveTarget(base: URL, rawPath: string | null): URL | null {
  if (!rawPath || rawPath === '') return base
  // "//evil.com" is protocol-relative and would resolve to another origin.
  if (!rawPath.startsWith('/') || rawPath.startsWith('//')) return null
  try {
    const target = new URL(rawPath, base.origin)
    return target.origin === base.origin ? target : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const token = params.get('token')
  const botId = params.get('bot')

  let ref: PresentRef
  let bot
  if (token) {
    ref = { token }
    bot = await getDemoBotByShareToken(token)
  } else if (botId) {
    ref = { bot: botId }
    const session = await getSessionUser()
    if (session?.profile.role !== 'owner') return notFound()
    bot = await getDemoBot(botId)
  } else {
    return notFound()
  }
  if (!bot) return notFound()

  const site = presentSiteUrl(bot)
  if (!site) return notFound()

  let base: URL
  try {
    base = await assertPublicUrl(site)
  } catch {
    return notFound()
  }

  const target = resolveTarget(base, params.get('path'))
  if (!target) return notFound()

  let res: Response
  try {
    res = await fetch(target, {
      headers: {
        'user-agent': PRESENT_FETCH_USER_AGENT,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'lt,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    // assertPublicUrl only validated the first hop.
    await assertPublicUrl(res.url || target.toString())
  } catch {
    return new Response('Backdrop unavailable', { status: 502 })
  }

  if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') ?? '')) {
    return new Response('Backdrop unavailable', { status: 502 })
  }

  const html = (await res.text()).slice(0, MAX_BYTES)
  const baseHref = res.url || target.toString()
  const body = rewritePresentHtml(html, {
    baseHref,
    proxyPrefix: presentProxyPrefix(req.nextUrl.origin, ref),
    sprites: await fetchSprites(html, new URL(baseHref).origin),
  })

  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
