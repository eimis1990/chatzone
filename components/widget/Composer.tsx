'use client'

import { useRef, useState, type KeyboardEvent, type FormEvent } from 'react'
import { readableTextColor, isLightColor } from '@/lib/utils'

interface ComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  primaryColor: string
  /** Active visitor language — drives the input placeholder. */
  language?: 'en' | 'lt'
  /** Corner radius (px) for the message field — shared with the nav buttons. */
  radius?: number
  /** Chat background color — the composer bar matches it (no background image). */
  backgroundColor?: string
  /** Optional custom send-button icon (replaces the default arrow). */
  sendIconUrl?: string
  /** Message-field background; text/placeholder auto-contrast. Empty = white. */
  fieldColor?: string
  /** Message-field border; empty = auto (subtle, derived from field color). */
  fieldBorderColor?: string
  /** Send button background; empty = primary color. */
  sendColor?: string
}

export function Composer({
  onSend,
  disabled = false,
  primaryColor,
  language,
  radius = 12,
  backgroundColor = '#ffffff',
  sendIconUrl,
  fieldColor,
  fieldBorderColor,
  sendColor,
}: ComposerProps) {
  // Match the chat background color so a dark theme doesn't leave a white bar.
  const lightBar = isLightColor(backgroundColor)
  // Field text must stay readable on any chosen field background.
  const fieldBg = fieldColor || '#ffffff'
  const lightField = isLightColor(fieldBg)
  const fieldFg = readableTextColor(fieldBg)
  const sendBg = sendColor || primaryColor
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  return (
    <div
      className="border-t"
      style={{
        backgroundColor,
        borderTopColor: lightBar ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)',
      }}
    >
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
          placeholder={language === 'lt' ? 'Rašykite žinutę…' : 'Type a message…'}
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          className="cbz-composer-input flex-1 resize-none border px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 overflow-hidden"
          style={
            {
              maxHeight: '120px',
              borderRadius: `${radius}px`,
              backgroundColor: fieldBg,
              color: fieldFg,
              borderColor:
                fieldBorderColor || (lightField ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)'),
              // Placeholder = the text color at reduced opacity (see globals.css).
              '--cbz-ph-color': `color-mix(in srgb, ${fieldFg} 55%, transparent)`,
              caretColor: fieldFg,
              '--tw-ring-color': primaryColor,
            } as React.CSSProperties
          }
        />

        {/* Send button — icon auto-contrasts; a light button gets a border so
            it stays visible on the white composer. */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          // 38px matches the single-line field height (20px line + 16px padding + borders).
          className={`h-[38px] w-[38px] flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed ${
            isLightColor(sendBg) ? 'border border-gray-300' : ''
          }`}
          // Radius follows the theme's button roundness (a 38px button caps at 19 = circle).
          style={{
            backgroundColor: sendBg,
            color: readableTextColor(sendBg),
            borderRadius: `${Math.min(radius, 19)}px`,
          }}
        >
          {sendIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sendIconUrl} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4" aria-hidden="true">
              <path d="M3.105 2.288a.75.75 0 00-.826.95l1.903 6.114H14.25a.75.75 0 010 1.5H4.182l-1.903 6.114a.75.75 0 00.826.95 28.897 28.897 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.288z" />
            </svg>
          )}
        </button>
      </form>
      {/* "Powered by Loqara" is rendered by the widget loader chrome (widget.js),
         below the close button — matching the reference layout. */}
    </div>
  )
}
