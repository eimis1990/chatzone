'use client'

import { useRef, useState, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import { MicIcon, SquareIcon, LoaderCircleIcon } from 'lucide-react'

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

type MicState = 'idle' | 'requesting' | 'recording' | 'transcribing' | 'denied'

export function Composer({ onSend, disabled = false, primaryColor, voice, publicKey }: ComposerProps) {
  const [value, setValue] = useState('')
  const [micState, setMicState] = useState<MicState>('idle')
  const [micError, setMicError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const showMic = Boolean(voice?.enabled && voice?.sttEnabled && publicKey)

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

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const handleMicClick = useCallback(async () => {
    // If currently recording, stop.
    if (micState === 'recording') {
      stopRecording()
      return
    }

    // If already in a pending state, ignore.
    if (micState === 'requesting' || micState === 'transcribing') return

    setMicError(null)
    setMicState('requesting')

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicState('denied')
      setMicError('Microphone access was denied. Please allow access in your browser settings.')
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    // Pick a supported MIME type.
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Release mic tracks.
      stream.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      const audioBlob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      })
      chunksRef.current = []

      if (audioBlob.size === 0) {
        setMicState('idle')
        return
      }

      setMicState('transcribing')

      try {
        const formData = new FormData()
        formData.append('publicKey', publicKey!)
        formData.append('audio', audioBlob, 'recording.webm')

        const res = await fetch('/api/stt', { method: 'POST', body: formData })

        if (!res.ok) {
          throw new Error('Transcription failed')
        }

        const data = (await res.json()) as { text?: string }
        if (data.text) {
          setValue(data.text)
          // Focus the textarea so the visitor can review/edit.
          setTimeout(() => textareaRef.current?.focus(), 0)
        }
      } catch {
        setMicError('Could not transcribe audio. Please type your message instead.')
      } finally {
        setMicState('idle')
      }
    }

    recorder.start()
    setMicState('recording')
  }, [micState, publicKey, stopRecording])

  const isRecording = micState === 'recording'
  const isBusy = micState === 'requesting' || micState === 'transcribing'

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Inline mic status messages */}
      {micState === 'recording' && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-red-600">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
          Recording… tap mic to stop
        </div>
      )}
      {micState === 'transcribing' && (
        <div className="flex items-center gap-2 px-4 pt-2 text-xs text-muted-foreground">
          <LoaderCircleIcon className="w-3 h-3 animate-spin" aria-hidden="true" />
          Transcribing…
        </div>
      )}
      {micError && (
        <div className="px-4 pt-2 text-xs text-amber-700" role="alert">
          {micError}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-3"
      >
        {/* Mic button — shown when STT is enabled */}
        {showMic && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isBusy || disabled}
            aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
            aria-pressed={isRecording}
            className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isRecording ? '#ef4444' : 'transparent',
              color: isRecording ? '#ffffff' : primaryColor,
              border: isRecording ? 'none' : `1.5px solid ${primaryColor}`,
            }}
          >
            {isBusy ? (
              <LoaderCircleIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : isRecording ? (
              <SquareIcon className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <MicIcon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        )}

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
    </div>
  )
}
