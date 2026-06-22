'use client'

import { useEffect, useRef, useState } from 'react'
import { ThumbsUpIcon, ThumbsDownIcon } from 'lucide-react'
import { ProductCards } from './ProductCards'
import { ThinkingDots } from './ThinkingDots'
import type { CommerceProduct } from '@/lib/commerce/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
  products?: CommerceProduct[]
}

interface MessageListProps {
  messages: ChatMessage[]
  primaryColor: string
  bubbleRadius?: number
  greeting: string
  displayName: string
  avatarUrl?: string
  activeLang?: 'en' | 'lt'
  onSeeAllProducts?: (products: CommerceProduct[]) => void
  onFeedback?: (messageId: string, value: 'up' | 'down') => void
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function MessageList({
  messages,
  primaryColor,
  bubbleRadius = 16,
  greeting,
  displayName,
  avatarUrl,
  activeLang = 'en',
  onSeeAllProducts,
  onFeedback,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgBubbleRadius = `${bubbleRadius}px`
  // Local feedback state (messageId → value) for the button highlight.
  const [feedback, setFeedback] = useState<Record<string, 'up' | 'down'>>({})

  const sendFeedback = (messageId: string, value: 'up' | 'down') => {
    setFeedback((prev) => ({ ...prev, [messageId]: value }))
    onFeedback?.(messageId, value)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        <div key={msg.id}>
          <div
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' && renderAvatar(displayName)}
            <div className="flex flex-col gap-1 max-w-[80%]">
              {/* Skip the empty bubble for cards-only (voice search) messages. */}
              {(msg.content || msg.streaming) && (
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
                  {msg.streaming && !msg.content ? (
                    <ThinkingDots />
                  ) : (
                    <>
                      {msg.content}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse bg-current opacity-70" />
                      )}
                    </>
                  )}
                </div>
              )}

              {/* 👍/👎 feedback on completed bot replies (real DB id only) */}
              {msg.role === 'assistant' &&
                !msg.streaming &&
                msg.content.length > 0 &&
                UUID_RE.test(msg.id) && (
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() => sendFeedback(msg.id, 'up')}
                      aria-label="Helpful"
                      aria-pressed={feedback[msg.id] === 'up'}
                      className={`flex size-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
                        feedback[msg.id] === 'up' ? 'text-primary' : 'text-gray-400'
                      }`}
                    >
                      <ThumbsUpIcon className="size-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => sendFeedback(msg.id, 'down')}
                      aria-label="Not helpful"
                      aria-pressed={feedback[msg.id] === 'down'}
                      className={`flex size-6 items-center justify-center rounded-md transition-colors hover:bg-gray-100 ${
                        feedback[msg.id] === 'down' ? 'text-destructive' : 'text-gray-400'
                      }`}
                    >
                      <ThumbsDownIcon className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Product cards — full chat width, below the message bubble */}
          {msg.role === 'assistant' &&
            !msg.streaming &&
            msg.products &&
            msg.products.length > 0 && (
              <ProductCards
                products={msg.products}
                bubbleRadius={bubbleRadius}
                primaryColor={primaryColor}
                language={activeLang}
                onSeeAll={onSeeAllProducts}
              />
            )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
