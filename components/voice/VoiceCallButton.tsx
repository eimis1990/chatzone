'use client'

/**
 * VoiceCallButton — reusable live-call UI for playground + widget.
 *
 * Uses @elevenlabs/react ConversationProvider + useConversation to start a
 * WebRTC session with a conversation token minted server-side.
 *
 * Props:
 *  - getToken: async function that returns the conversation token string.
 *    Should throw (or return undefined) when unavailable.
 *  - primaryColor: theme color for the button + status pill.
 *  - appearance: 'full' (default, labeled button) | 'compact' (icon-only circle for composer).
 *  - className: optional extra class on the root element.
 */

import { useCallback, useEffect, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { PhoneIcon, PhoneOffIcon, LoaderCircleIcon } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

/** High-level call state surfaced to the host (e.g. header subtitle). */
export type CallState = 'idle' | 'connecting' | 'listening' | 'speaking'

interface VoiceCallButtonProps {
  getToken: () => Promise<string>
  primaryColor?: string
  appearance?: 'full' | 'compact'
  /** Conversation language — starts the agent in this language (en/lt). */
  language?: 'en' | 'lt'
  /** Reports call state changes so the host can show listening/speaking. */
  onStateChange?: (state: CallState) => void
  /** Each finalized utterance (visitor + agent) so the host can show it in chat. */
  onTranscript?: (role: 'user' | 'assistant', text: string) => void
  /** Hands the host an `end()` so it can hang up (e.g. when the visitor types). */
  onReady?: (controls: { end: () => void }) => void
  /** Implements the agent's `search_products` client tool — return a short
   *  spoken summary; the host renders the product cards in the chat. */
  onSearch?: (query: string) => Promise<string>
  className?: string
}

// ─── Inner component — must live inside <ConversationProvider> ────────────────

interface InnerProps {
  getToken: () => Promise<string>
  primaryColor: string
  appearance: 'full' | 'compact'
  language?: 'en' | 'lt'
  onStateChange?: (state: CallState) => void
  onTranscript?: (role: 'user' | 'assistant', text: string) => void
  onReady?: (controls: { end: () => void }) => void
  onSearch?: (query: string) => Promise<string>
}

function VoiceCallInner({
  getToken,
  primaryColor,
  appearance,
  language,
  onStateChange,
  onTranscript,
  onReady,
  onSearch,
}: InnerProps) {
  const [callError, setCallError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const conv = useConversation({
    onError: (msg: string) => {
      setCallError('Call error — please try again.')
      console.error('[VoiceCallButton] conversation error:', msg)
    },
    onMessage: (m: { message?: string; source?: string }) => {
      const text = m?.message?.trim()
      if (!text) return
      onTranscript?.(m.source === 'user' ? 'user' : 'assistant', text)
    },
    clientTools: {
      // The agent calls this; the host fetches + renders product cards and we
      // return a short summary for the agent to speak.
      search_products: async (params: { query?: string }) => {
        const q = params?.query?.trim()
        if (!q || !onSearch) return 'No results found.'
        try {
          return await onSearch(q)
        } catch {
          return 'The product search is temporarily unavailable.'
        }
      },
    },
  })

  const { status, isSpeaking, startSession, endSession } = conv

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'
  const isActive = isConnected || isConnecting

  // Surface a high-level state to the host (header shows listening/speaking).
  const callState: CallState = isConnecting
    ? 'connecting'
    : isConnected
      ? isSpeaking
        ? 'speaking'
        : 'listening'
      : 'idle'
  useEffect(() => {
    onStateChange?.(callState)
  }, [callState, onStateChange])

  // Expose an end() control so the host can hang up the call programmatically.
  useEffect(() => {
    onReady?.({ end: () => void endSession() })
  }, [onReady, endSession])

  const handleStart = useCallback(async () => {
    setCallError(null)
    setMicDenied(false)
    setUnavailable(false)

    // Request mic permission first — surface denial before even fetching token.
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicDenied(true)
      return
    }

    let token: string
    try {
      token = await getToken()
    } catch (err: unknown) {
      const isUnavailable =
        err instanceof Error &&
        (err.message.toLowerCase().includes('503') ||
          err.message.toLowerCase().includes('unavailable'))
      if (isUnavailable) {
        setUnavailable(true)
        return
      }
      setCallError('Could not start call — please try again.')
      return
    }

    try {
      await startSession({
        conversationToken: token,
        ...(language ? { overrides: { agent: { language } } } : {}),
      })
    } catch (err: unknown) {
      const isUnavailable =
        err instanceof Error &&
        (err.message.toLowerCase().includes('503') ||
          err.message.toLowerCase().includes('unavailable'))
      if (isUnavailable) {
        setUnavailable(true)
        return
      }
      setCallError('Could not connect — please try again.')
    }
  }, [getToken, startSession, language])

  const handleEnd = useCallback(async () => {
    await endSession()
    setCallError(null)
  }, [endSession])

  // When voice calling is unavailable, hide the button entirely in compact mode.
  if (unavailable && appearance === 'compact') return null

  // ── Compact (icon-only) appearance — square, matches the restart button ──────
  if (appearance === 'compact') {
    const squareBtn =
      'flex items-center justify-center size-8 rounded-lg flex-shrink-0 text-white transition-opacity hover:opacity-85'

    if (isConnecting) {
      return (
        <button
          type="button"
          disabled
          aria-label="Connecting voice call…"
          className={squareBtn}
          style={{ backgroundColor: '#22c55e' }}
        >
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        </button>
      )
    }

    if (isConnected) {
      // Red = in a call; tap to end.
      return (
        <button
          type="button"
          onClick={handleEnd}
          aria-label={`End voice call${isSpeaking ? ' — bot is speaking' : ''}`}
          className={squareBtn}
          style={{ backgroundColor: '#ef4444' }}
        >
          <FilledPhoneIcon />
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={handleStart}
        aria-label="Start voice call"
        title={micDenied ? 'Microphone access denied' : callError ?? 'Start voice call'}
        className={squareBtn}
        style={{ backgroundColor: '#22c55e' }}
      >
        <FilledPhoneIcon />
      </button>
    )
  }

  // ── Full (labeled) appearance ────────────────────────────────────────────────
  // Status label shown while a call is active.
  const statusLabel = (() => {
    if (isConnecting) return 'Connecting…'
    if (isConnected && isSpeaking) return 'Speaking…'
    if (isConnected) return 'In call — listening'
    return null
  })()

  return (
    <div className="flex items-center gap-2">
      {/* Status pill — shown only during an active call */}
      {isActive && statusLabel && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: primaryColor }}
          aria-live="polite"
        >
          {isConnecting ? (
            <LoaderCircleIcon className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <span
              className={`size-2 rounded-full bg-white ${isSpeaking ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />
          )}
          {statusLabel}
        </span>
      )}

      {/* Mic-denied message */}
      {micDenied && (
        <span className="text-xs text-amber-700" role="alert">
          Microphone access denied. Please allow it in your browser settings.
        </span>
      )}

      {/* Call error message */}
      {callError && !isActive && (
        <span className="text-xs text-amber-700" role="alert">
          {callError}
        </span>
      )}

      {/* Unavailable message */}
      {unavailable && (
        <span className="text-xs text-muted-foreground" role="alert">
          Voice calling isn&apos;t available right now.
        </span>
      )}

      {/* Main button — phone/end call */}
      {!unavailable && (
        isActive ? (
          <button
            type="button"
            onClick={handleEnd}
            aria-label="End voice call"
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#ef4444' }}
          >
            <PhoneOffIcon className="size-3.5" aria-hidden="true" />
            End call
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStart}
            aria-label="Start voice call"
            className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            <PhoneIcon className="size-3.5" aria-hidden="true" />
            Call
          </button>
        )
      )}
    </div>
  )
}

// Solid (filled) phone glyph for the compact button.
function FilledPhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.165.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
    </svg>
  )
}

// ─── Public component — wraps inner in ConversationProvider ──────────────────

export function VoiceCallButton({
  getToken,
  primaryColor = '#4f46e5',
  appearance = 'full',
  language,
  onStateChange,
  onTranscript,
  onReady,
  onSearch,
  className,
}: VoiceCallButtonProps) {
  return (
    <div className={className}>
      <ConversationProvider>
        <VoiceCallInner
          getToken={getToken}
          primaryColor={primaryColor}
          appearance={appearance}
          language={language}
          onStateChange={onStateChange}
          onTranscript={onTranscript}
          onReady={onReady}
          onSearch={onSearch}
        />
      </ConversationProvider>
    </div>
  )
}
