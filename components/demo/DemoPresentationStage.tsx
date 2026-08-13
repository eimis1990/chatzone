import { ArrowRightIcon } from 'lucide-react'
import { assertPublicUrl } from '@/lib/net/ssrf'
import { PRESENT_FETCH_USER_AGENT } from '@/lib/demo/present-proxy'
import { PresentBackdropFrame } from '@/components/demo/PresentBackdropFrame'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

export interface DemoPresentationStageProps {
  name: string
  publicKey: string
  storeUrl?: string
  /** Same-origin proxy URL for the backdrop — see `lib/demo/present-proxy.ts`. */
  siteProxyUrl?: string
}

/**
 * Whether our server can fetch the page at all. Framing headers are no longer
 * part of the decision — the proxy strips them — but a site behind a CDN that
 * blocks datacenter IPs still can't be proxied, and that falls to the
 * screenshot, which the *visitor's* browser loads from wp.com instead.
 */
async function siteFetchable(storeUrl: string): Promise<boolean> {
  try {
    const url = await assertPublicUrl(storeUrl)
    const res = await fetch(url, {
      headers: { 'user-agent': PRESENT_FETCH_USER_AGENT },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    })
    // Headers are all we need; don't pull a megabyte of HTML we won't parse.
    void res.body?.cancel()
    return res.ok && /text\/html/i.test(res.headers.get('content-type') ?? '')
  } catch {
    return false
  }
}

/** Shared full-screen stage for the private preview and token-gated share URL. */
export async function DemoPresentationStage({
  name,
  publicKey,
  storeUrl,
  siteProxyUrl,
}: DemoPresentationStageProps) {
  const canFrame = storeUrl && siteProxyUrl ? await siteFetchable(storeUrl) : false
  // Free WordPress mShots screenshots. The first request can briefly show its
  // generation placeholder; reloading once replaces it with the store capture.
  const screenshotUrl = storeUrl && !canFrame
    ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(storeUrl)}?w=1920&vpw=1920&vph=1200`
    : undefined
  const hasBackdrop = canFrame || Boolean(screenshotUrl)

  return (
    <div className={`relative min-h-svh ${hasBackdrop ? 'bg-white' : 'bg-dots'}`}>
      {canFrame && siteProxyUrl ? (
        <PresentBackdropFrame src={siteProxyUrl} title={`${name} store`} />
      ) : screenshotUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={screenshotUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      ) : null}

      {/* Compact corner badge, stuck flush to the top-left: Loqara → client. */}
      <div className="pointer-events-none absolute left-0 top-0">
        <h1
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-900 ${
            hasBackdrop ? 'bg-white/85 shadow-sm backdrop-blur' : ''
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/loqara-logo-colorful.webp"
            alt=""
            aria-hidden="true"
            width={20}
            height={20}
            className="size-5 shrink-0 object-contain"
          />
          Loqara
          <ArrowRightIcon className="size-4 shrink-0 text-gray-400" aria-hidden="true" />
          {name}
        </h1>
      </div>
      <WidgetEmbed botKey={publicKey} />
    </div>
  )
}
