'use client'

import { useState, type FormEvent } from 'react'
import type { BotLanguage } from '@/lib/types'
import type { OrderStatus } from '@/lib/commerce/types'
import { readableTextColor } from '@/lib/utils'

// Built-in strings — the fields are fixed by the lookup API (order id + billing
// email for every provider), so nothing here is configurable per bot.
const STRINGS: Record<BotLanguage, {
  title: string
  orderId: string
  email: string
  track: string
  tracking: string
  fillIn: string
  notFound: string
  unavailable: string
}> = {
  en: {
    title: 'Track your order',
    orderId: 'Order number',
    email: 'Email used on the order',
    track: 'Track order',
    tracking: 'Looking up…',
    fillIn: 'Please fill in both fields.',
    notFound: 'No order matches that number and email. Check both and try again.',
    unavailable: 'The order lookup is temporarily unavailable. Please try again later.',
  },
  lt: {
    title: 'Sekite savo užsakymą',
    orderId: 'Užsakymo numeris',
    email: 'El. paštas, nurodytas užsakyme',
    track: 'Sekti užsakymą',
    tracking: 'Ieškoma…',
    fillIn: 'Užpildykite abu laukus.',
    notFound: 'Užsakymo su tokiu numeriu ir el. paštu nerasta. Patikrinkite ir bandykite dar kartą.',
    unavailable: 'Užsakymų paieška laikinai neveikia. Bandykite vėliau.',
  },
}

interface OrderLookupFormProps {
  /** Runs the identity-gated lookup (widget or preview transport). */
  lookup: (orderId: string, email: string) => Promise<{ found: boolean; order?: OrderStatus }>
  /** A matched order — the host appends it to the chat as a card. */
  onFound: (order: OrderStatus) => void
  onDismiss: () => void
  primaryColor: string
  /** Widget chat background — the panel sits on it with a border. */
  backgroundColor: string
  borderColor: string
  /** Message-bubble radius, so the panel matches the bubbles. */
  bubbleRadius: number
  lang?: BotLanguage
}

/**
 * The "Track your order" quick-action panel: order number + email → the
 * existing order-status card. Occupies the lead form's slot in ChatWindow.
 */
export function OrderLookupForm({
  lookup,
  onFound,
  onDismiss,
  primaryColor,
  backgroundColor,
  borderColor,
  bubbleRadius,
  lang = 'en',
}: OrderLookupFormProps) {
  const t = STRINGS[lang] ?? STRINGS.en
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fg = readableTextColor(backgroundColor)
  const inputRadius = Math.min(bubbleRadius, 12)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!orderId.trim() || !email.trim()) {
      setError(t.fillIn)
      return
    }
    setBusy(true)
    try {
      const r = await lookup(orderId.trim(), email.trim())
      if (r.found && r.order) onFound(r.order)
      else setError(t.notFound)
    } catch {
      setError(t.unavailable)
    } finally {
      setBusy(false)
    }
  }

  const inputClass =
    'w-full border bg-transparent px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0'
  const inputStyle = {
    borderColor,
    color: fg,
    borderRadius: inputRadius,
    '--tw-ring-color': primaryColor,
  } as React.CSSProperties

  return (
    <div
      className="mx-4 mb-4 flex max-h-[78%] min-h-0 flex-col border shadow-sm"
      style={{ backgroundColor, borderColor, color: fg, borderRadius: bubbleRadius }}
    >
      <div className="flex shrink-0 items-center justify-between border-b px-4 pt-3 pb-2" style={{ borderColor }}>
        <p className="text-sm font-semibold">{t.title}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-lg leading-none opacity-50 hover:opacity-80"
        >
          ×
        </button>
      </div>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <div>
            <label htmlFor="order-lookup-id" className="mb-1 block text-xs font-medium opacity-80">
              {t.orderId}
            </label>
            <input
              id="order-lookup-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              autoComplete="off"
              inputMode="text"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="order-lookup-email" className="mb-1 block text-xs font-medium opacity-80">
              {t.email}
            </label>
            <input
              id="order-lookup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={inputClass}
              style={inputStyle}
            />
          </div>
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="shrink-0 border-t p-3" style={{ borderColor }}>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ backgroundColor: primaryColor, color: readableTextColor(primaryColor), borderRadius: inputRadius }}
          >
            {busy ? t.tracking : t.track}
          </button>
        </div>
      </form>
    </div>
  )
}
