'use client'

import { PackageIcon, TruckIcon } from 'lucide-react'
import type { OrderStatus } from '@/lib/commerce/types'

interface OrderStatusCardProps {
  order: OrderStatus
  bubbleRadius?: number
  primaryColor: string
  language?: 'en' | 'lt'
  /** Component-library variant: 'timeline' adds a delivery progress stepper. */
  variant?: 'default' | 'timeline'
}

// Timeline steps + which step a status has reached (-1 = not a linear status,
// e.g. cancelled/refunded — those render without the stepper).
const TIMELINE_STEPS = {
  en: ['Ordered', 'Processing', 'Shipped', 'Delivered'],
  lt: ['Užsakyta', 'Vykdomas', 'Išsiųstas', 'Pristatyta'],
}
const TIMELINE_INDEX: Record<string, number> = {
  pending: 0,
  'on-hold': 0,
  processing: 1,
  shipped: 2,
  completed: 3,
}

const LABELS = {
  en: { order: 'Order', total: 'Total', tracking: 'Tracking', items: 'Items' },
  lt: { order: 'Užsakymas', total: 'Iš viso', tracking: 'Sekimo nr.', items: 'Prekės' },
}

// Localized status label + badge color for common WooCommerce statuses.
const STATUS: Record<string, { en: string; lt: string; cls: string }> = {
  pending: { en: 'Pending payment', lt: 'Laukiama apmokėjimo', cls: 'bg-amber-100 text-amber-800' },
  processing: { en: 'Processing', lt: 'Vykdomas', cls: 'bg-blue-100 text-blue-800' },
  'on-hold': { en: 'On hold', lt: 'Sulaikytas', cls: 'bg-amber-100 text-amber-800' },
  completed: { en: 'Completed', lt: 'Įvykdytas', cls: 'bg-green-100 text-green-800' },
  shipped: { en: 'Shipped', lt: 'Išsiųstas', cls: 'bg-green-100 text-green-800' },
  cancelled: { en: 'Cancelled', lt: 'Atšauktas', cls: 'bg-red-100 text-red-700' },
  refunded: { en: 'Refunded', lt: 'Grąžinti pinigai', cls: 'bg-gray-100 text-gray-700' },
  failed: { en: 'Failed', lt: 'Nepavyko', cls: 'bg-red-100 text-red-700' },
}

export function OrderStatusCard({
  order,
  bubbleRadius = 16,
  primaryColor,
  language = 'en',
  variant = 'default',
}: OrderStatusCardProps) {
  if (!order.found) return null
  const t = LABELS[language] ?? LABELS.en
  const radius = `${Math.min(bubbleRadius, 16)}px`
  const statusKey = (order.status ?? '').toLowerCase()
  const status = STATUS[statusKey]
  const statusLabel = status ? status[language] ?? status.en : order.status ?? '—'
  const statusCls = status?.cls ?? 'bg-gray-100 text-gray-700'
  const totalText = [order.total, order.currency].filter(Boolean).join(' ')
  const timelineIndex = variant === 'timeline' ? (TIMELINE_INDEX[statusKey] ?? -1) : -1
  const steps = TIMELINE_STEPS[language] ?? TIMELINE_STEPS.en

  return (
    <div
      className="mt-1 w-full border border-gray-200 bg-white overflow-hidden text-sm"
      style={{ borderRadius: radius }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-100">
        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
          <PackageIcon className="size-4" style={{ color: primaryColor }} aria-hidden="true" />
          {t.order} #{order.orderNumber}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      {/* Delivery timeline (variant) — dots + connectors, filled up to the
          current step. Non-linear statuses (cancelled/refunded) skip it. */}
      {timelineIndex >= 0 && (
        <div className="px-3 pt-2.5 pb-1" aria-label={steps[timelineIndex]}>
          <div className="flex items-center">
            {steps.map((_, i) => (
              <div key={i} className={`flex items-center ${i > 0 ? 'flex-1' : ''}`}>
                {i > 0 && (
                  <div
                    className="h-0.5 flex-1 rounded-full"
                    style={{ backgroundColor: i <= timelineIndex ? primaryColor : '#e5e7eb' }}
                  />
                )}
                <div
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: i <= timelineIndex ? primaryColor : '#e5e7eb',
                    outline: i === timelineIndex ? `3px solid ${primaryColor}33` : undefined,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-gray-500">
            {steps.map((label, i) => (
              <span key={label} className={i === timelineIndex ? 'font-semibold text-gray-900' : ''}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Items */}
      {order.items && order.items.length > 0 && (
        <ul className="px-3 py-2 space-y-1">
          {order.items.slice(0, 6).map((it, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-gray-700">
              <span className="truncate">
                {it.name}
                {it.quantity > 1 ? <span className="text-gray-400"> ×{it.quantity}</span> : null}
              </span>
              {it.total ? <span className="flex-shrink-0 tabular-nums text-gray-500">{it.total}</span> : null}
            </li>
          ))}
        </ul>
      )}

      {/* Total + tracking */}
      <div className="px-3 py-2 border-t border-gray-100 space-y-1">
        {totalText && (
          <div className="flex items-center justify-between font-medium text-gray-900">
            <span>{t.total}</span>
            <span className="tabular-nums">{totalText}</span>
          </div>
        )}
        {order.tracking?.number && (
          <div className="flex items-center gap-1.5 text-gray-600">
            <TruckIcon className="size-3.5 flex-shrink-0" aria-hidden="true" />
            <span className="text-xs">
              {t.tracking}:{' '}
              {order.tracking.url ? (
                <a
                  href={order.tracking.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline"
                  style={{ color: primaryColor }}
                >
                  {order.tracking.number}
                </a>
              ) : (
                <span className="font-medium text-gray-900">{order.tracking.number}</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
