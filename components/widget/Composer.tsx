'use client'

import { useRef, useState, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import { VoiceCallButton } from '@/components/voice/VoiceCallButton'

interface VoiceConfig {
  enabled: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
}

interface ComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  primaryColor: string
  voice?: VoiceConfig
  publicKey?: string
}

export function Composer({ onSend, disabled = false, primaryColor, voice, publicKey }: ComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const showCallButton = Boolean(voice?.enabled && publicKey)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  const getToken = useCallback(async (): Promise<string> => {
    const res = await fetch('/api/widget/voice-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(
        res.status === 503
          ? 'Voice calling unavailable'
          : (data.error ?? 'Token request failed'),
      )
    }
    const data = (await res.json()) as { token: string }
    return data.token
  }, [publicKey])

  return (
    <div className="border-t border-gray-200 bg-white">
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-3"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Type a message…"
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 overflow-hidden"
          style={{ maxHeight: '120px', '--tw-ring-color': primaryColor } as React.CSSProperties}
        />

        {/* Voice call button — compact circle, only when voice is enabled */}
        {showCallButton && (
          <VoiceCallButton
            appearance="compact"
            getToken={getToken}
            primaryColor={primaryColor}
          />
        )}

        {/* Send button */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: primaryColor }}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
            <path d="M3.105 2.288a.75.75 0 00-.826.95l1.903 6.114H14.25a.75.75 0 010 1.5H4.182l-1.903 6.114a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.288z" />
          </svg>
        </button>
      </form>
      {/* "Powered by Chatzone" is rendered by the widget loader chrome (widget.js),
         below the close button — matching the reference layout. */}
    </div>
  )
}
