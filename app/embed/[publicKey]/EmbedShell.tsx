'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatWindow } from '@/components/widget/ChatWindow'
import { createWidgetTransport } from '@/lib/widget-transport'
import type { PublicBotConfig } from '@/lib/widget-config'

interface EmbedShellProps {
  publicKey: string
}

export function EmbedShell({ publicKey }: EmbedShellProps) {
  const [config, setConfig] = useState<PublicBotConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The parent (widget.js) knows the real outer viewport; it tells us whether
  // the widget is a full-screen mobile sheet so the header can show a ✕ instead
  // of the avatar. Undefined until the first message arrives.
  const [parentMobile, setParentMobile] = useState<boolean | undefined>(undefined)
  const transport = useMemo(() => createWidgetTransport(publicKey), [publicKey])

  // The loading indicator shows before config arrives, so it can't read the
  // theme yet. widget.js passes the accent color as ?c= so the loader is tinted
  // correctly; the bot's real color takes over once loaded. Read it in an effect
  // (not during render) so SSR and the first client render agree — no hydration
  // mismatch — then update to the real color a frame later.
  const [loaderColor, setLoaderColor] = useState('#e2650f')
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('c')
    if (c && /^#?[0-9a-fA-F]{3,8}$/.test(c)) setLoaderColor(c.startsWith('#') ? c : `#${c}`)
  }, [])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source === window.parent && e.data?.type === 'cbz-viewport') {
        setParentMobile(!!e.data.mobile)
      }
    }
    window.addEventListener('message', onMessage)
    // Ask the parent for the current viewport in case we mounted after it sent.
    window.parent?.postMessage({ type: 'cbz-ready' }, '*')
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // widget.js lazy-creates this iframe on the visitor's first launcher click,
  // so one mount = one real widget open (toggles just hide/show the iframe).
  const openTracked = useRef(false)
  useEffect(() => {
    if (!config || openTracked.current) return
    openTracked.current = true
    transport.trackEvent?.({ type: 'widget_open' })
  }, [config, transport])

  useEffect(() => {
    fetch(`/api/widget-config?key=${encodeURIComponent(publicKey)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Bot unavailable')
        return res.json() as Promise<PublicBotConfig>
      })
      .then(setConfig)
      .catch(() => setError('This chatbot is currently unavailable.'))
  }, [publicKey])

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center text-sm text-gray-500">
        {error}
      </div>
    )
  }

  if (!config) {
    return (
      <div className="h-full flex items-center justify-center">
        <div
          className="cbz-grid-loader"
          style={{ ['--cbz-loader-color' as string]: loaderColor }}
          role="status"
          aria-label="Loading"
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="cbz-cube" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ChatWindow
      config={config}
      transport={transport}
      // Full-screen mobile embed: the in-header ✕ asks the parent (widget.js) to
      // close, since the floating launcher is hidden while open on mobile.
      onRequestClose={() => window.parent?.postMessage({ type: 'cbz-close' }, '*')}
      isMobileOverride={parentMobile}
    />
  )
}
