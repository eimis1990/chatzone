'use client'

import { useEffect, useRef } from 'react'
import { PRESENT_NAV_MESSAGE_KEY } from '@/lib/demo/present-proxy'

/**
 * The sandboxed backdrop iframe plus the parent half of in-frame navigation.
 *
 * The proxied page posts `{ [PRESENT_NAV_MESSAGE_KEY]: '/path?query' }` on
 * link clicks and THIS component navigates the frame by setting `src`. The
 * frame must never navigate itself: its sandbox gives it an opaque origin, so
 * self-initiated navigations are cross-site to the browser and our
 * SameSite=Lax auth cookies get stripped — the owner-session check in
 * `/api/present/site` then 404s and the stage goes blank after the first
 * click. Parent-initiated src loads carry cookies like the initial one.
 */
export function PresentBackdropFrame({ src, title }: { src: string; title: string }) {
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const el = frame.current
      // The sandboxed frame's origin is opaque (event.origin === 'null'), so
      // identity is checked by source window, not origin.
      if (!el || event.source !== el.contentWindow) return
      const path = (event.data as Record<string, unknown>)?.[PRESENT_NAV_MESSAGE_KEY]
      if (typeof path !== 'string' || !path.startsWith('/')) return
      const next = new URL(src, window.location.origin)
      next.searchParams.set('path', path)
      el.src = next.pathname + next.search
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [src])

  return (
    // Sandboxed WITHOUT allow-same-origin: the proxy serves the client's page
    // from our origin, so this is the boundary that keeps their scripts off
    // our cookies and storage. Never add allow-same-origin.
    <iframe
      ref={frame}
      src={src}
      title={title}
      sandbox="allow-scripts allow-popups"
      className="absolute inset-0 h-full w-full border-0"
    />
  )
}
