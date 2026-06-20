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
 *  - className: optional extra class on the root element.
 */

import { useCallback, useState } from 'react'
import { ConversationProvider, useConversation } from '@elevenlabs/react'
import { PhoneIcon, PhoneOffIcon, LoaderCircleIcon } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface VoiceCallButtonProps {
  getToken: () => Promise<string>
  primaryColor?: string
  className?: string
}

// ─── Inner component — must live inside <ConversationProvider> ────────────────

interface InnerProps {
  getToken: () => Promise<string>
  primaryColor: string
}

function VoiceCallInner({ getToken, primaryColor }: InnerProps) {
  const [callError, setCallError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)

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

  const handleStart = useCallback(async () => {
    setCallError(null)
    setMicDenied(false)

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
      const msg =
        err instanceof Error &&
        (err.message.toLowerCase().includes('503') ||
          err.message.toLowerCase().includes('unavailable'))
          ? 'Voice calling isn\'t available right now.'
          : 'Could not start call — please try again.'
      setCallError(msg)
      return
    }

    try {
      await startSession({ conversationToken: token })
    } catch (err: unknown) {
      const msg =
        err instanceof Error &&
        (err.message.toLowerCase().includes('503') ||
          err.message.toLowerCase().includes('unavailable'))
          ? 'Voice calling isn\'t available right now.'
          : 'Could not connect — please try again.'
      setCallError(msg)
    }
  }, [getToken, startSession])

  const handleEnd = useCallback(async () => {
    await endSession()
    setCallError(null)
  }, [endSession])

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

      {/* Main button — phone/end call */}
      {isActive ? (
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
      )}
    </div>
  )
}

// ─── Public component — wraps inner in ConversationProvider ──────────────────

export function VoiceCallButton({
  getToken,
  primaryColor = '#4f46e5',
  className,
}: VoiceCallButtonProps) {
  return (
    <div className={className}>
      <ConversationProvider>
        <VoiceCallInner getToken={getToken} primaryColor={primaryColor} />
      </ConversationProvider>
    </div>
  )
}
