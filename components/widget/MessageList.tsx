'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Volume2Icon, LoaderCircleIcon, SquareIcon } from 'lucide-react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface VoiceConfig {
  enabled: boolean
  ttsEnabled: boolean
  sttEnabled: boolean
}

interface MessageListProps {
  messages: ChatMessage[]
  primaryColor: string
  bubbleRadius?: number
  greeting: string
  displayName: string
  avatarUrl?: string
  voice?: VoiceConfig
  publicKey?: string
}

/**
 * Regex to detect a temporary client-side id (generateId() output from ChatWindow).
 * Real DB UUIDs are v4 format; client ids are base-36 random strings of ~11 chars.
 * We show the TTS button only for messages with a real UUID.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isRealMessageId(id: string): boolean {
  return UUID_RE.test(id)
}

type TtsState = 'idle' | 'loading' | 'playing'

/**
 * Singleton audio ref shared across the message list so only one message plays
 * at a time. Passed down as a ref object to each TTS button.
 */
interface TtsButtonProps {
  messageId: string
  publicKey: string
  primaryColor: string
  activeRef: React.MutableRefObject<{ id: string; audio: HTMLAudioElement } | null>
  onStateChange: (id: string, state: TtsState) => void
  state: TtsState
}

function TtsButton({ messageId, publicKey, primaryColor, activeRef, onStateChange, state }: TtsButtonProps) {
  const handleClick = useCallback(async () => {
    // Stop any currently playing audio.
    if (activeRef.current) {
      activeRef.current.audio.pause()
      const prevId = activeRef.current.id
      activeRef.current = null
      if (prevId !== messageId) {
        onStateChange(prevId, 'idle')
      }
    }

    // If this button was already playing, just stop.
    if (state === 'playing') {
      onStateChange(messageId, 'idle')
      return
    }

    onStateChange(messageId, 'loading')

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, messageId }),
      })

      if (!res.ok) {
        onStateChange(messageId, 'idle')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)

      activeRef.current = { id: messageId, audio }

      audio.onended = () => {
        URL.revokeObjectURL(url)
        if (activeRef.current?.id === messageId) {
          activeRef.current = null
        }
        onStateChange(messageId, 'idle')
      }

      audio.onerror = () => {
        URL.revokeObjectURL(url)
        if (activeRef.current?.id === messageId) {
          activeRef.current = null
        }
        onStateChange(messageId, 'idle')
      }

      await audio.play()
      onStateChange(messageId, 'playing')
    } catch {
      onStateChange(messageId, 'idle')
    }
  }, [messageId, publicKey, state, activeRef, onStateChange])

  const label =
    state === 'loading' ? 'Loading audio…' : state === 'playing' ? 'Stop audio' : 'Play message'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      aria-label={label}
      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ color: primaryColor }}
    >
      {state === 'loading' ? (
        <LoaderCircleIcon className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
      ) : state === 'playing' ? (
        <SquareIcon className="w-3 h-3" aria-hidden="true" />
      ) : (
        <Volume2Icon className="w-3.5 h-3.5" aria-hidden="true" />
      )}
    </button>
  )
}

export function MessageList({
  messages,
  primaryColor,
  bubbleRadius = 16,
  greeting,
  displayName,
  avatarUrl,
  voice,
  publicKey,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  // Map of messageId → TtsState for all assistant messages.
  const [ttsStates, setTtsStates] = useState<Record<string, TtsState>>({})
  // Singleton active playback ref (shared across all TTS buttons).
  const activeAudioRef = useRef<{ id: string; audio: HTMLAudioElement } | null>(null)

  const showTts = Boolean(voice?.enabled && voice?.ttsEnabled && publicKey)
  const msgBubbleRadius = `${bubbleRadius}px`

  const handleTtsStateChange = useCallback((id: string, state: TtsState) => {
    setTtsStates((prev) => ({ ...prev, [id]: state }))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.audio.pause()
        activeAudioRef.current = null
      }
    }
  }, [])

  const renderAvatar = (alt: string) =>
    avatarUrl ? (
      <img
        src={avatarUrl}
        alt={alt}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
      />
    ) : (
      <div
        className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-white text-xs font-bold"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      >
        {displayName.charAt(0).toUpperCase()}
      </div>
    )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
      {/* Greeting message always shown first */}
      <div className="flex items-start gap-2">
        {renderAvatar(displayName)}
        <div
          className="max-w-[80%] px-3 py-2 bg-gray-100 text-gray-900 text-sm"
          style={{
            borderRadius: `${msgBubbleRadius} ${msgBubbleRadius} ${msgBubbleRadius} 2px`,
          }}
        >
          {greeting}
        </div>
      </div>

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          {msg.role === 'assistant' && renderAvatar(displayName)}
          <div className="flex flex-col gap-1 max-w-[80%]">
            <div
              className={`px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
              style={{
                borderRadius: msg.role === 'user'
                  ? `${msgBubbleRadius} ${msgBubbleRadius} 2px ${msgBubbleRadius}`
                  : `${msgBubbleRadius} ${msgBubbleRadius} ${msgBubbleRadius} 2px`,
                ...(msg.role === 'user' ? { backgroundColor: primaryColor } : {}),
              }}
            >
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-current opacity-70" />
              )}
            </div>

            {/* TTS play button — only for completed assistant messages with real DB ids */}
            {showTts &&
              msg.role === 'assistant' &&
              !msg.streaming &&
              msg.content.length > 0 &&
              isRealMessageId(msg.id) && (
                <div className="flex items-center">
                  <TtsButton
                    messageId={msg.id}
                    publicKey={publicKey!}
                    primaryColor={primaryColor}
                    activeRef={activeAudioRef}
                    onStateChange={handleTtsStateChange}
                    state={ttsStates[msg.id] ?? 'idle'}
                  />
                </div>
              )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
