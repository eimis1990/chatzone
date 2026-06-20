'use client'

import { BotIcon, SendIcon } from 'lucide-react'
import type { BotConfig } from '@/lib/types'

// Partial to tolerate mid-edit form state where optional fields may be undefined
interface ChatPreviewProps {
  config: {
    displayName?: string
    greeting?: string
    suggestedQuestions?: string[]
    theme?: Partial<BotConfig['theme']>
  }
}

export function ChatPreview({ config }: ChatPreviewProps) {
  const { displayName, greeting, suggestedQuestions, theme } = config
  const primaryColor = theme?.primaryColor ?? '#4f46e5'

  return (
    <div className="flex flex-col h-full rounded-xl border bg-background overflow-hidden shadow-lg">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
          <BotIcon className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{displayName || 'Your Bot'}</p>
          <p className="text-xs opacity-80">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {/* Bot greeting */}
        <div className="flex items-end gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: primaryColor }}
          >
            <BotIcon className="size-3.5 text-white" />
          </div>
          <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 max-w-[80%]">
            <p className="text-sm">{greeting || 'Hi! How can I help you today?'}</p>
          </div>
        </div>

        {/* Example user message */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-br-sm px-3 py-2 max-w-[80%] text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <p className="text-sm">What can you help me with?</p>
          </div>
        </div>

        {/* Example assistant reply */}
        <div className="flex items-end gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: primaryColor }}
          >
            <BotIcon className="size-3.5 text-white" />
          </div>
          <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 max-w-[80%]">
            <p className="text-sm">
              I can answer questions based on my knowledge base. Just ask me anything!
            </p>
          </div>
        </div>
      </div>

      {/* Suggested questions */}
      {suggestedQuestions && suggestedQuestions.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {suggestedQuestions.slice(0, 3).map((q, i) => (
            <button
              key={i}
              type="button"
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted transition-colors"
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
          <span className="flex-1 text-sm text-muted-foreground">Type a message…</span>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-md text-white transition-opacity hover:opacity-80"
            style={{ backgroundColor: primaryColor }}
            aria-label="Send"
          >
            <SendIcon className="size-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground/60">
          Powered by Chatzone
        </p>
      </div>
    </div>
  )
}
