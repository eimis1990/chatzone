'use client'

import { useEffect, useState } from 'react'
import { ChatWindow } from '@/components/widget/ChatWindow'
import type { PublicBotConfig } from '@/lib/widget-config'

interface EmbedShellProps {
  publicKey: string
}

export function EmbedShell({ publicKey }: EmbedShellProps) {
  const [config, setConfig] = useState<PublicBotConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  return <ChatWindow publicKey={publicKey} config={config} />
}
