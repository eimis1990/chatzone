'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type FormEvent } from 'react'
import { readableTextColor, isLightColor } from '@/lib/utils'

/** Voice-call wiring for the composer-placed call button (callButtonPlacement
 *  = 'composer'). state !== 'idle' switches the whole bar into call mode. */
export interface ComposerVoiceCall {
  state: 'idle' | 'connecting' | 'listening' | 'speaking'
  start: () => void
  end: () => void
  /** Idle call-button background; text auto-contrasts. */
  callColor: string
}

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
  /** When set, the right button is a call button while the field is empty and
   *  morphs into send while typing; an active call turns the bar into a
   *  waveform + red end button. */
  voiceCall?: ComposerVoiceCall
  /** Whisper dictation: record → transcribe → returned text is appended to the
   *  field. Presence of the handler shows the mic button (plan-gated upstream). */
  onTranscribe?: (audio: Blob) => Promise<string>
  /** External notice shown above the bar (e.g. mic denied for the call button). */
  notice?: string | null
}

type DictationState = 'idle' | 'recording' | 'transcribing'
const DICTATION_MAX_MS = 60_000

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
  voiceCall,
  onTranscribe,
  notice,
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

  // ── Dictation (Whisper) ──────────────────────────────────────────────────────
  const [dictation, setDictation] = useState<DictationState>('idle')
  const [dictationError, setDictationError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopRecorder = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current)
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  // Release the mic if the widget unmounts mid-recording.
  useEffect(() => () => stopRecorder(), [])

  const toggleDictation = async () => {
    if (!onTranscribe || dictation === 'transcribing') return
    if (dictation === 'recording') {
      stopRecorder()
      return
    }
    setDictationError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setDictationError(
        language === 'lt'
          ? 'Mikrofonas nepasiekiamas — leiskite jį naršyklės nustatymuose.'
          : 'Microphone unavailable — allow it in your browser settings.',
      )
      return
    }
    const chunks: BlobPart[] = []
    // Default container per browser (webm on Chrome, mp4 on Safari) — Whisper accepts both.
    const rec = new MediaRecorder(stream)
    recorderRef.current = rec
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data)
    }
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      recorderRef.current = null
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
      if (!blob.size) {
        setDictation('idle')
        return
      }
      setDictation('transcribing')
      try {
        const text = (await onTranscribe(blob)).trim()
        if (text) {
          setValue((v) => (v.trim() ? `${v.replace(/\s+$/, '')} ${text}` : text))
          textareaRef.current?.focus()
        }
      } catch {
        setDictationError(
          language === 'lt'
            ? 'Nepavyko atpažinti įrašo — bandykite dar kartą.'
            : "Couldn't transcribe that — please try again.",
        )
      } finally {
        setDictation('idle')
      }
    }
    rec.start()
    setDictation('recording')
    stopTimerRef.current = setTimeout(stopRecorder, DICTATION_MAX_MS)
  }

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

  const callActive = voiceCall != null && voiceCall.state !== 'idle'
  // Empty field + composer-placed call → the right button starts a call.
  const callMode = voiceCall != null && !value.trim()
  const lt = language === 'lt'

  // Shared 38px right-slot button style (matches the single-line field height).
  const rightBtnClass =
    'h-[38px] w-[38px] flex items-center justify-center flex-shrink-0 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed'
  const rightBtnRadius = `${Math.min(radius, 19)}px`

  const barBorderTop = lightBar ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)'
  const fieldBorder =
    fieldBorderColor || (lightField ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)')

  // One notice line above the bar: external (call issues) wins over dictation's.
  const activeNotice = notice ?? dictationError
  const noticeEl = activeNotice ? (
    <p
      role="alert"
      className="px-4 pt-2 text-xs"
      style={{ color: lightBar ? '#b45309' : '#fcd34d' }}
    >
      {activeNotice}
    </p>
  ) : null

  // Wave field — the message field turned into an animated waveform with a red
  // stop pill. Shared by active calls and dictation recording.
  const waveField = (label: string, speaking: boolean, stopLabel: string, onStop: () => void) => (
    <div
      className="flex h-[38px] flex-1 items-center gap-2 border pl-4 pr-1.5"
      role="status"
      aria-label={label}
      style={{
        borderRadius: `${radius}px`,
        backgroundColor: fieldBg,
        borderColor: fieldBorder,
        color: fieldFg,
      }}
    >
      <div
        className="flex flex-1 items-center justify-center gap-[3px] overflow-hidden"
        data-speaking={speaking}
        aria-hidden="true"
      >
        {Array.from({ length: 27 }, (_, i) => (
          <span
            key={i}
            className="cbz-wave-bar"
            style={{
              // Deterministic pseudo-random rhythm (no Math.random → SSR-safe).
              animationDelay: `${((i * 37) % 10) * 0.09}s`,
              animationDuration: `${0.7 + ((i * 13) % 5) * 0.11}s`,
            }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onStop}
        aria-label={stopLabel}
        className="flex h-[28px] w-[44px] flex-shrink-0 items-center justify-center transition hover:brightness-95"
        style={{ backgroundColor: '#fee2e2', borderRadius: `${Math.min(radius, 14)}px` }}
      >
        <span className="block size-3 rounded-[3px] bg-red-500" aria-hidden="true" />
      </button>
    </div>
  )

  // ── Active call: waveform bar + red end button ─────────────────────────────
  if (callActive) {
    return (
      <div className="border-t" style={{ backgroundColor, borderTopColor: barBorderTop }}>
        {noticeEl}
        <div className="flex items-end gap-2 px-4 py-3">
          {waveField(
            lt ? 'Vyksta pokalbis balsu' : 'Voice call in progress',
            voiceCall.state === 'speaking',
            lt ? 'Baigti pokalbį' : 'End call',
            voiceCall.end,
          )}
        </div>
      </div>
    )
  }

  // ── Normal composer ─────────────────────────────────────────────────────────
  return (
    <div
      className="border-t"
      style={{
        backgroundColor,
        borderTopColor: barBorderTop,
      }}
    >
      {noticeEl}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 py-3"
      >
        {dictation === 'recording' ? (
          // Recording: the field becomes the same waveform as a live call —
          // lively bars (it's hearing you) + red stop, which then transcribes.
          waveField(
            lt ? 'Įrašoma' : 'Recording',
            true,
            lt ? 'Baigti diktavimą' : 'Stop dictation',
            stopRecorder,
          )
        ) : (
          <>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={lt ? 'Rašykite žinutę…' : 'Type a message…'}
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
              borderColor: fieldBorder,
              // Placeholder = the text color at reduced opacity (see globals.css).
              '--cbz-ph-color': `color-mix(in srgb, ${fieldFg} 55%, transparent)`,
              caretColor: fieldFg,
              '--tw-ring-color': primaryColor,
            } as React.CSSProperties
          }
        />

        {/* Dictation — tap to record (the field becomes the waveform above),
            stop → Whisper → text lands in the field. Plan-gated upstream. */}
        {onTranscribe && (
          <button
            type="button"
            onClick={toggleDictation}
            disabled={disabled || dictation === 'transcribing'}
            title={lt ? 'Diktuoti žinutę' : 'Dictate a message'}
            aria-label={lt ? 'Diktuoti žinutę' : 'Dictate a message'}
            className={`${rightBtnClass} border`}
            style={{
              backgroundColor: 'transparent',
              color: lightBar ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)',
              borderColor: lightBar ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.22)',
              borderRadius: rightBtnRadius,
            }}
          >
            {dictation === 'transcribing' ? <SpinnerIcon /> : <MicIcon />}
          </button>
        )}

        {callMode ? (
          // Call button — same slot as send; morphs into send once the visitor types.
          <button
            type="button"
            onClick={voiceCall.start}
            disabled={disabled}
            aria-label={lt ? 'Kalbėti su agentu' : 'Talk with agent'}
            className={`${rightBtnClass} ${isLightColor(voiceCall.callColor) ? 'border border-gray-300' : ''}`}
            style={{
              backgroundColor: voiceCall.callColor,
              color: readableTextColor(voiceCall.callColor),
              borderRadius: rightBtnRadius,
            }}
          >
            <PhoneIcon />
          </button>
        ) : (
          // Send button — icon auto-contrasts; a light button gets a border so
          // it stays visible on the white composer.
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className={`${rightBtnClass} ${isLightColor(sendBg) ? 'border border-gray-300' : ''}`}
            style={{
              backgroundColor: sendBg,
              color: readableTextColor(sendBg),
              borderRadius: rightBtnRadius,
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
        )}
          </>
        )}
      </form>
      {/* "Powered by Loqara" is rendered by the widget loader chrome (widget.js),
         below the close button — matching the reference layout. */}
    </div>
  )
}

// Solid (filled) phone glyph — matches the header call button's icon.
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.165.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4 animate-spin" aria-hidden="true">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  )
}
