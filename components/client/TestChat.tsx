'use client'

/**
 * TestChat — Interactive preview playground for the bot configurator.
 *
 * Renders as a floating chat widget (launcher bubble + open/close card) docked
 * to the bottom-right of the preview panel, matching the deployed widget appearance.
 *
 * Features:
 *  - Floating launcher bubble with open/close toggle
 *  - Streams bot replies from POST /api/preview/chat
 *  - TTS (🔊) per bot message via POST /api/preview/tts when voice.ttsEnabled
 *  - Live voice call via ElevenLabs WebRTC (VoiceCallButton) in composer
 *  - Suggested question chips pinned above input, hidden after first message
 *  - Start over button restores suggested questions
 *  - Live theming from config.theme (primaryColor, cornerRadius, bubbleRadius)
 *  - Avatar from config.avatarUrl (falls back to BotIcon)
 *  - "Powered by Chatzone" footer link below the card
 *  - Active language (activeLang) drives which content.<lang> is shown
 */

import { useState, useRef, useCallback, type KeyboardEvent, type FormEvent } from 'react'
import {
  BotIcon,
  RotateCcwIcon,
  LoaderCircleIcon,
  SquareIcon,
  Volume2Icon,
  SendIcon,
  MessageCircleIcon,
  XIcon,
} from 'lucide-react'
import type { BotConfig, BotLanguage } from '@/lib/types'
import { VoiceCallButton } from '@/components/voice/VoiceCallButton'
import { POWERED_BY_URL } from '@/lib/utils'

// Partial form values — fields may be undefined mid-edit.
// voice.voices is kept as a loose Record to accommodate RHF partial types (en may be undefined).
type LiveConfig = {
  displayName?: string
  theme?: Partial<BotConfig['theme']>
  voice?: {
    enabled?: boolean
    ttsEnabled?: boolean
    sttEnabled?: boolean
    voices?: Partial<Record<string, string>>
  }
  model?: string
  temperature?: number
  systemPrompt?: string
  persona?: Partial<BotConfig['persona']>
  leadCapture?: {
    enabled?: boolean
    trigger?: BotConfig['leadCapture']['trigger']
    afterNMessages?: number
    fields?: Array<{ key: string; label: string; required?: boolean }>
  }
  allowedDomains?: string[]
  avatarUrl?: string
  languages?: BotLanguage[]
  content?: Partial<Record<BotLanguage, {
    greeting?: string
    suggestedQuestions?: string[]
    fallbackMessage?: string
  }>>
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

type TtsState = 'idle' | 'loading' | 'playing'

function generateId() {
  return Math.random().toString(36).slice(2)
}

interface TestChatProps {
  botId: string
  config: LiveConfig
  activeLang: BotLanguage
}

export function TestChat({ botId, config, activeLang }: TestChatProps) {
  const primaryColor = config.theme?.primaryColor ?? '#4f46e5'
  const cornerRadius = config.theme?.cornerRadius ?? 16
  const bubbleRadius = config.theme?.bubbleRadius ?? 16
  const displayName = config.displayName || 'Your Bot'
  const avatarUrl = config.avatarUrl

  // Per-language content
  const langContent = config.content?.[activeLang]
  const greeting = langContent?.greeting || (activeLang === 'lt' ? 'Sveiki! Kaip galiu padėti?' : 'Hi! How can I help you today?')
  const suggestedQuestions = (langContent?.suggestedQuestions ?? []).filter(Boolean)

  const voiceEnabled = config.voice?.enabled ?? false
  const ttsEnabled = voiceEnabled && (config.voice?.ttsEnabled ?? true)
  // Use per-language voice id
  const voiceId = (config.voice?.voices as Record<string, string> | undefined)?.[activeLang] ?? ''

  // Open/closed state
  const [isOpen, setIsOpen] = useState(true)

  // Message state — starts with just the greeting
  const greetingMsg: ChatMessage = { id: 'greeting', role: 'assistant', content: greeting }
  const [messages, setMessages] = useState<ChatMessage[]>([greetingMsg])
  const [streaming, setStreaming] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [suggestedVisible, setSuggestedVisible] = useState(true)

  // TTS state — one audio at a time
  const [ttsStates, setTtsStates] = useState<Record<string, TtsState>>({})
  const activeAudioRef = useRef<{ id: string; audio: HTMLAudioElement } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Re-initialize when greeting changes (language switch or config change)
  const prevGreetingRef = useRef(greeting)
  if (prevGreetingRef.current !== greeting) {
    prevGreetingRef.current = greeting
    // Reset on greeting change — update the greeting message without full reset
    setMessages([{ id: 'greeting', role: 'assistant', content: greeting }])
    setSuggestedVisible(true)
  }

  // -------------------------------------------------------------------------
  // Scroll to bottom on new messages
  // -------------------------------------------------------------------------
  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // -------------------------------------------------------------------------
  // Send a message
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    async (text: string) => {
      if (streaming || !text.trim()) return
      setSuggestedVisible(false)

      const userMsg: ChatMessage = { id: generateId(), role: 'user', content: text.trim() }
      const assistantMsg: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        streaming: true,
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreaming(true)
      setInputValue('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      // Build history from current messages (exclude the greeting from history)
      const history = messages
        .filter((m) => m.id !== 'greeting' && !m.streaming)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      // Build a full BotConfig from the live partial config (fill in defaults)
      const fullConfig = buildFullConfig(config)

      try {
        const res = await fetch('/api/preview/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botId,
            config: fullConfig,
            history,
            message: text.trim(),
            language: activeLang,
          }),
        })

        if (!res.ok || !res.body) {
          const errorText = 'Sorry, something went wrong. Please try again.'
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: errorText, streaming: false } : m,
            ),
          )
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const chunk = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: chunk, streaming: true } : m,
            ),
          )
          scrollBottom()
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: accumulated, streaming: false } : m,
          ),
        )
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Sorry, something went wrong. Please try again.', streaming: false }
              : m,
          ),
        )
      } finally {
        setStreaming(false)
        scrollBottom()
      }
    },
    [streaming, messages, botId, config, activeLang, scrollBottom],
  )

  // -------------------------------------------------------------------------
  // Start over
  // -------------------------------------------------------------------------
  const handleStartOver = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.audio.pause()
      activeAudioRef.current = null
    }
    setTtsStates({})
    setMessages([{ id: 'greeting', role: 'assistant', content: greeting }])
    setSuggestedVisible(true)
    setInputValue('')
  }, [greeting])

  // -------------------------------------------------------------------------
  // TTS playback
  // -------------------------------------------------------------------------
  const handleTts = useCallback(
    async (messageId: string, content: string) => {
      if (activeAudioRef.current) {
        activeAudioRef.current.audio.pause()
        const prevId = activeAudioRef.current.id
        activeAudioRef.current = null
        if (prevId !== messageId) {
          setTtsStates((prev) => ({ ...prev, [prevId]: 'idle' }))
        }
      }

      const currentState = ttsStates[messageId] ?? 'idle'
      if (currentState === 'playing') {
        setTtsStates((prev) => ({ ...prev, [messageId]: 'idle' }))
        return
      }

      if (!voiceId) return
      setTtsStates((prev) => ({ ...prev, [messageId]: 'loading' }))

      try {
        const res = await fetch('/api/preview/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content, voiceId, language: activeLang }),
        })

        if (!res.ok) {
          setTtsStates((prev) => ({ ...prev, [messageId]: 'idle' }))
          return
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)

        activeAudioRef.current = { id: messageId, audio }

        audio.onended = () => {
          URL.revokeObjectURL(url)
          if (activeAudioRef.current?.id === messageId) activeAudioRef.current = null
          setTtsStates((prev) => ({ ...prev, [messageId]: 'idle' }))
        }
        audio.onerror = () => {
          URL.revokeObjectURL(url)
          if (activeAudioRef.current?.id === messageId) activeAudioRef.current = null
          setTtsStates((prev) => ({ ...prev, [messageId]: 'idle' }))
        }

        await audio.play()
        setTtsStates((prev) => ({ ...prev, [messageId]: 'playing' }))
      } catch {
        setTtsStates((prev) => ({ ...prev, [messageId]: 'idle' }))
      }
    },
    [ttsStates, voiceId, activeLang],
  )

  // -------------------------------------------------------------------------
  // Form submit / keyboard
  // -------------------------------------------------------------------------
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(inputValue)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  // -------------------------------------------------------------------------
  // Avatar helper
  // -------------------------------------------------------------------------
  const renderAvatar = (size: 'sm' | 'md' = 'sm') => {
    const sizeClass = size === 'md' ? 'w-10 h-10' : 'w-7 h-7'
    return (
      <div
        className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden`}
        style={{ backgroundColor: avatarUrl ? 'transparent' : primaryColor }}
        aria-hidden="true"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <BotIcon className={size === 'md' ? 'size-5' : 'size-3.5'} />
        )}
      </div>
    )
  }

  const msgBubbleRadius = `${bubbleRadius}px`

  // -------------------------------------------------------------------------
  // The preview panel: floating bottom-right widget
  // -------------------------------------------------------------------------
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl bg-muted/30">
      {/* Chat Card — floating above the bubble */}
      {isOpen && (
        <div
          className="absolute bottom-[72px] right-4 w-[360px] max-w-[calc(100%-2rem)] flex flex-col bg-background border shadow-2xl pointer-events-auto overflow-hidden"
          style={{
            borderRadius: `${cornerRadius}px`,
            maxHeight: 'calc(100% - 88px)',
            height: '520px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 text-white flex-shrink-0"
            style={{
              backgroundColor: primaryColor,
              borderRadius: `${cornerRadius}px ${cornerRadius}px 0 0`,
            }}
          >
            <div
              className="flex size-8 items-center justify-center rounded-full overflow-hidden flex-shrink-0"
              style={{ backgroundColor: avatarUrl ? 'transparent' : 'rgba(255,255,255,0.2)' }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <BotIcon className="size-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight truncate">{displayName}</p>
              <p className="text-xs opacity-80">Online</p>
            </div>

            <button
              type="button"
              onClick={handleStartOver}
              title="Start over"
              aria-label="Start over — clear test conversation"
              className="flex items-center gap-1.5 text-xs opacity-80 hover:opacity-100 transition-opacity rounded px-2 py-1 hover:bg-white/10"
            >
              <RotateCcwIcon className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Start over</span>
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
            role="log"
            aria-live="polite"
            aria-label="Test conversation"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {msg.role === 'assistant' && renderAvatar()}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div
                    className={`px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'text-white'
                        : 'bg-muted text-foreground'
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
                      <span
                        className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-current opacity-70"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* TTS button */}
                  {ttsEnabled &&
                    msg.role === 'assistant' &&
                    !msg.streaming &&
                    msg.content.length > 0 &&
                    voiceId && (
                      <div className="flex items-center">
                        <TtsButton
                          messageId={msg.id}
                          content={msg.content}
                          primaryColor={primaryColor}
                          state={ttsStates[msg.id] ?? 'idle'}
                          onPlay={handleTts}
                        />
                      </div>
                    )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions */}
          {suggestedVisible && suggestedQuestions.length > 0 && (
            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-1.5">
              {suggestedQuestions.slice(0, 4).map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(q)}
                  disabled={streaming}
                  className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors disabled:opacity-50 text-left leading-normal"
                  style={{ borderColor: primaryColor, color: primaryColor }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="border-t p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder="Type a message…"
                disabled={streaming}
                rows={1}
                aria-label="Test message input"
                className="flex-1 resize-none rounded-lg border border-input px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-1 disabled:opacity-50 overflow-hidden bg-background"
                style={{ maxHeight: '120px' }}
              />

              {/* Voice call button */}
              {voiceEnabled && (
                <VoiceCallButton
                  appearance="compact"
                  primaryColor={primaryColor}
                  getToken={async () => {
                    const res = await fetch('/api/preview/voice-token', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ botId }),
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
                  }}
                />
              )}

              <button
                type="submit"
                disabled={streaming || !inputValue.trim()}
                aria-label="Send message"
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {streaming ? (
                  <LoaderCircleIcon className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <SendIcon className="size-3.5" aria-hidden="true" />
                )}
              </button>
            </form>

            <div className="mt-1.5 text-center">
              <p className="text-[10px] text-muted-foreground/60">
                Test mode — not saved or logged
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Powered by — below the bubble */}
      {isOpen && (
        <div className="absolute bottom-[20px] right-4 text-center pointer-events-auto">
          <p className="text-[10px] text-muted-foreground/50">
            Powered by{' '}
            <a
              href={POWERED_BY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-muted-foreground transition-colors"
            >
              Chatzone
            </a>
          </p>
        </div>
      )}

      {/* Launcher bubble */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? 'Close chat preview' : 'Open chat preview'}
        className="absolute bottom-8 right-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95 pointer-events-auto"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <XIcon className="size-6 text-white" aria-hidden="true" />
        ) : (
          <>
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <MessageCircleIcon className="size-7 text-white" aria-hidden="true" />
            )}
          </>
        )}
      </button>
    </div>
  )
}

// -------------------------------------------------------------------------
// TtsButton subcomponent
// -------------------------------------------------------------------------
interface TtsButtonProps {
  messageId: string
  content: string
  primaryColor: string
  state: TtsState
  onPlay: (messageId: string, content: string) => void
}

function TtsButton({ messageId, content, primaryColor, state, onPlay }: TtsButtonProps) {
  const label =
    state === 'loading' ? 'Loading audio…' : state === 'playing' ? 'Stop audio' : 'Play message'

  return (
    <button
      type="button"
      onClick={() => onPlay(messageId, content)}
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

// -------------------------------------------------------------------------
// Helper: build a full BotConfig from the partial live form values
// -------------------------------------------------------------------------
function buildFullConfig(config: LiveConfig): BotConfig {
  const languages = (config.languages ?? ['en']) as BotConfig['languages']

  const content: BotConfig['content'] = {
    en: {
      greeting: config.content?.en?.greeting ?? 'Hi! How can I help you?',
      suggestedQuestions: config.content?.en?.suggestedQuestions ?? [],
      fallbackMessage:
        config.content?.en?.fallbackMessage ??
        "I'm not sure about that — let me take your details so someone can follow up.",
    },
  }
  if (languages.includes('lt') && config.content?.lt) {
    content.lt = {
      greeting: config.content.lt.greeting ?? 'Sveiki! Kaip galiu padėti?',
      suggestedQuestions: config.content.lt.suggestedQuestions ?? [],
      fallbackMessage: config.content.lt.fallbackMessage ?? 'Atsiprašau, nežinau atsakymo.',
    }
  }

  return {
    displayName: config.displayName ?? 'Bot',
    avatarUrl: config.avatarUrl,
    theme: {
      primaryColor: config.theme?.primaryColor ?? '#4f46e5',
      position: config.theme?.position ?? 'bottom-right',
      bubbleIcon: config.theme?.bubbleIcon,
      cornerRadius: config.theme?.cornerRadius ?? 16,
      bubbleRadius: config.theme?.bubbleRadius ?? 16,
    },
    voice: {
      enabled: config.voice?.enabled ?? false,
      ttsEnabled: config.voice?.ttsEnabled ?? true,
      sttEnabled: config.voice?.sttEnabled ?? true,
      voices: {
        en: (config.voice?.voices as Record<string, string> | undefined)?.en ?? '21m00Tcm4TlvDq8ikWAM',
        lt: (config.voice?.voices as Record<string, string> | undefined)?.lt,
      },
    },
    languages,
    content,
    systemPrompt: config.systemPrompt ?? 'You are a helpful assistant.',
    persona: {
      tone: config.persona?.tone ?? 'friendly',
      verbosity: config.persona?.verbosity ?? 'balanced',
    },
    model: config.model ?? 'gpt-4o-mini',
    temperature: config.temperature ?? 0.3,
    leadCapture: {
      enabled: config.leadCapture?.enabled ?? false,
      trigger: config.leadCapture?.trigger ?? 'on_fallback',
      afterNMessages: config.leadCapture?.afterNMessages,
      fields: (config.leadCapture?.fields ?? []).map((f) => ({
        key: f.key,
        label: f.label,
        required: f.required ?? false,
      })),
    },
    allowedDomains: config.allowedDomains ?? [],
  }
}
