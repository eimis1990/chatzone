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
  className?: string
}

// ─── Inner component — must live inside <ConversationProvider> ────────────────

interface InnerProps {
  getToken: () => Promise<string>
  primaryColor: string
  appearance: 'full' | 'compact'
  language?: 'en' | 'lt'
  onStateChange?: (state: CallState) => void
}

function VoiceCallInner({ getToken, primaryColor, appearance, language, onStateChange }: InnerProps) {
  const [callError, setCallError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  const conv = useConversation({
    onError: (msg: string) => {
      setCallError('Call error — please try again.')
      console.error('[VoiceCallButton] conversation error:', msg)
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

  // ── Compact (icon-only) appearance ──────────────────────────────────────────
  if (appearance === 'compact') {
    if (isConnecting) {
      return (
        <button
          type="button"
          disabled
          aria-label="Connecting voice call…"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-opacity"
          style={{ borderColor: primaryColor, color: primaryColor }}
        >
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
        </button>
      )
    }

    if (isConnected) {
      return (
        <button
          type="button"
          onClick={handleEnd}
          aria-label={`End voice call${isSpeaking ? ' — bot is speaking' : ''}`}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: '#ef4444' }}
        >
          <PhoneOffIcon className="size-4" aria-hidden="true" />
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={handleStart}
        aria-label="Start voice call"
        title={micDenied ? 'Microphone access denied' : callError ?? 'Start voice call'}
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border transition-opacity hover:opacity-80"
        style={{ borderColor: primaryColor, color: primaryColor }}
      >
        <PhoneIcon className="size-4" aria-hidden="true" />
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

// ─── Public component — wraps inner in ConversationProvider ──────────────────

export function VoiceCallButton({
  getToken,
  primaryColor = '#4f46e5',
  appearance = 'full',
  language,
  onStateChange,
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
        />
      </ConversationProvider>
    </div>
  )
}
