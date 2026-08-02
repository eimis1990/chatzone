import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/guards'

// Owner-only pitch stage — auth redirects anonymous requests, and this keeps
// the route out of indexes if it is ever reachable.
export const metadata: Metadata = { robots: { index: false, follow: false } }
import { createServiceClient } from '@/lib/supabase/service'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'
import type { Bot } from '@/lib/types'

/**
 * Whether the store page may be shown in an iframe: reachable, and neither
 * X-Frame-Options nor CSP frame-ancestors forbids cross-origin embedding.
 * Any failure means "no" — the stage falls back to a screenshot or the dots.
 */
async function storeEmbeddable(storeUrl: string): Promise<boolean> {
  try {
    const url = await assertPublicUrl(storeUrl)
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false
    if (/deny|sameorigin/i.test(res.headers.get('x-frame-options') ?? '')) return false
    const ancestors = (res.headers.get('content-security-policy') ?? '')
      .match(/frame-ancestors\s+([^;]+)/i)?.[1]
    if (ancestors && !ancestors.includes('*')) return false
    return true
  } catch {
    return false
  }
}

/**
 * Full-screen presentation stage for a demo bot: the client's own store as the
 * backdrop with the real widget floating over it — reads as "the bot is
 * already installed on your site". Live iframe when the store allows framing;
 * most stores send X-Frame-Options, so the usual backdrop is a screenshot.
 * No store (or nothing renderable) → the original clean dotted stage.
 * Owner-only; lives outside the owner shell so there is no sidebar.
 */
export default async function PresentPage({ params }: { params: Promise<{ botId: string }> }) {
  await requireRole('owner')
  const { botId } = await params

  const svc = createServiceClient()
  const { data: bot } = await svc
    .from('bots')
    .select('id, name, public_key, config, org_id, organizations!inner(is_demo, is_platform)')
    .eq('id', botId)
    .single<Pick<Bot, 'id' | 'name' | 'public_key' | 'config'>>()
  if (!bot) notFound()

  const storeUrl = bot.config.commerce?.storeUrl
  const canFrame = storeUrl ? await storeEmbeddable(storeUrl) : false
  // ponytail: free WordPress mShots screenshots (first request may show its
  // "generating" placeholder — reload once). If this proves flaky, capture
  // per-bot screenshots with playwright at demo-setup time instead.
  const screenshotUrl = storeUrl && !canFrame
    ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(storeUrl)}?w=1920&vpw=1920&vph=1200`
    : undefined
  const hasBackdrop = canFrame || Boolean(screenshotUrl)

  return (
    <div className={`relative min-h-svh ${hasBackdrop ? 'bg-white' : 'bg-dots'}`}>
      {canFrame && storeUrl ? (
        <iframe
          src={storeUrl}
          title={`${bot.name} store`}
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : screenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}

      {/* Client's name leads; our logo sits underneath as the quiet attribution. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start p-6">
        <div className={hasBackdrop ? 'rounded-xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur' : ''}>
          <h1 className="text-xl font-semibold">{bot.name}</h1>
          <span className="mt-1 flex items-center gap-1.5 text-sm font-bold text-gray-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/loqara-logo-colorful.webp"
              alt=""
              aria-hidden="true"
              width={20}
              height={20}
              className="size-5 shrink-0 object-contain"
            />
            Loqara<span className="text-primary">.</span>
          </span>
        </div>
      </div>
      <WidgetEmbed botKey={bot.public_key} />
    </div>
  )
}
