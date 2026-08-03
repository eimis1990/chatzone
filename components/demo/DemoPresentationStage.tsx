import { assertPublicUrl } from '@/lib/net/ssrf'
import { WidgetEmbed } from '@/components/landing/WidgetEmbed'

export interface DemoPresentationStageProps {
  name: string
  publicKey: string
  storeUrl?: string
}

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

/** Shared full-screen stage for the private preview and token-gated share URL. */
export async function DemoPresentationStage({
  name,
  publicKey,
  storeUrl,
}: DemoPresentationStageProps) {
  const canFrame = storeUrl ? await storeEmbeddable(storeUrl) : false
  // Free WordPress mShots screenshots. The first request can briefly show its
  // generation placeholder; reloading once replaces it with the store capture.
  const screenshotUrl = storeUrl && !canFrame
    ? `https://s0.wp.com/mshots/v1/${encodeURIComponent(storeUrl)}?w=1920&vpw=1920&vph=1200`
    : undefined
  const hasBackdrop = canFrame || Boolean(screenshotUrl)

  return (
    <div className={`relative min-h-svh ${hasBackdrop ? 'bg-white' : 'bg-dots'}`}>
      {canFrame && storeUrl ? (
        <iframe
          src={storeUrl}
          title={`${name} store`}
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

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start p-6">
        <div className={hasBackdrop ? 'rounded-xl bg-white/85 px-3 py-2 shadow-sm backdrop-blur' : ''}>
          <h1 className="text-xl font-semibold">{name}</h1>
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
      <WidgetEmbed botKey={publicKey} />
    </div>
  )
}
