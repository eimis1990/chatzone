'use client'

import { useEffect, useRef, useState } from 'react'
import { ThumbsUpIcon, ThumbsDownIcon, HeadsetIcon } from 'lucide-react'
import { ProductCards } from './ProductCards'
import { OrderStatusCard } from './OrderStatusCard'
import { ThinkingDots } from './ThinkingDots'
import { readableTextColor } from '@/lib/utils'
import type { CommerceProduct, OrderStatus } from '@/lib/commerce/types'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Text shown in the bubble when it should differ from `content` (e.g. a
   *  quick-action button's short label while `content` holds the sent prompt). */
  displayContent?: string
  streaming?: boolean
  products?: CommerceProduct[]
  /** An order-status lookup result, rendered as a card. */
  order?: OrderStatus
  /** Assistant message authored by a human agent (handoff) vs. the bot. */
  fromHuman?: boolean
}

interface MessageListProps {
  messages: ChatMessage[]
  primaryColor: string
  bubbleRadius?: number
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

  // Human-agent replies get a distinct avatar so they don't look like the bot.
  const renderHumanAvatar = () => (
    <div
      className="w-8 h-8 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center bg-gray-800 text-white"
      aria-label="Agent"
      title="Agent"
    >
      <HeadsetIcon className="size-4" aria-hidden="true" />
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
      {messages.map((msg) => (
        <div key={msg.id}>
          <div
            className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'assistant' &&
              (msg.fromHuman ? renderHumanAvatar() : renderAvatar(displayName))}
            <div className="flex flex-col gap-1 max-w-[80%]">
              {/* Skip the empty bubble for cards-only (voice search) messages. */}
              {(msg.content || msg.streaming) && (
                <div
                  className={`px-3 py-2 text-sm whitespace-pre-wrap ${
                    msg.role === 'user' ? '' : 'bg-gray-100 text-gray-900'
                  }`}
                  style={{
                    borderRadius: msg.role === 'user'
                      ? `${msgBubbleRadius} ${msgBubbleRadius} 2px ${msgBubbleRadius}`
                      : `${msgBubbleRadius} ${msgBubbleRadius} ${msgBubbleRadius} 2px`,
                    ...(msg.role === 'user'
                      ? { backgroundColor: primaryColor, color: readableTextColor(primaryColor) }
                      : {}),
                  }}
                >
                  {msg.streaming && !msg.content ? (
                    <ThinkingDots />
                  ) : (
                    <>
                      {msg.displayContent ?? msg.content}
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
                !msg.fromHuman &&
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

          {/* Order-status card */}
          {msg.role === 'assistant' && !msg.streaming && msg.order?.found && (
            <div className="pl-10">
              <OrderStatusCard
                order={msg.order}
                bubbleRadius={bubbleRadius}
                primaryColor={primaryColor}
                language={activeLang}
              />
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
