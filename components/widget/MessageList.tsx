'use client'

import { useEffect, useRef } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface MessageListProps {
  messages: ChatMessage[]
  primaryColor: string
  greeting: string
  displayName: string
  avatarUrl?: string
}

export function MessageList({
  messages,
  primaryColor,
  greeting,
  displayName,
  avatarUrl,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
      {/* Greeting message always shown first */}
      <div className="flex items-start gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
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
        )}
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2 bg-gray-100 text-gray-900 text-sm">
          {greeting}
        </div>
      </div>

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
        >
          {msg.role === 'assistant' && (
            avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
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
          )}
          <div
            className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'text-white rounded-tr-sm'
                : 'bg-gray-100 text-gray-900 rounded-tl-sm'
            }`}
            style={msg.role === 'user' ? { backgroundColor: primaryColor } : undefined}
          >
            {msg.content}
            {msg.streaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-current opacity-70" />
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
