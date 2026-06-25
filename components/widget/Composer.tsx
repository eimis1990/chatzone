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
}

export function Composer({
  onSend,
  disabled = false,
  primaryColor,
  language,
  radius = 12,
  backgroundColor = '#ffffff',
}: ComposerProps) {
  // Match the chat background color so a dark theme doesn't leave a white bar.
  const lightBar = isLightColor(backgroundColor)
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
          className="flex-1 resize-none border border-gray-200 bg-white px-3 py-2 text-sm leading-5 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 overflow-hidden"
          style={{ maxHeight: '120px', borderRadius: `${radius}px`, '--tw-ring-color': primaryColor } as React.CSSProperties}
        />

        {/* Send button — icon auto-contrasts; a light button gets a border so
            it stays visible on the white composer. */}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed ${
            isLightColor(primaryColor) ? 'border border-gray-300' : ''
          }`}
          style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor) }}
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
