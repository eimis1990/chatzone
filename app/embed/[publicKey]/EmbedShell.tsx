'use client'

import { useEffect, useMemo, useState } from 'react'
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
          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#6366f1', borderTopColor: 'transparent' }}
          role="status"
          aria-label="Loading"
        />
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
