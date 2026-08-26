'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next'
import { captureFirstTouch, isPublicMarketingPath } from '@/lib/acquisition'

function keepPublicEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    return isPublicMarketingPath(new URL(event.url, window.location.origin).pathname)
      ? event
      : null
  } catch {
    return null
  }
}

/**
 * Capture first touch before a visitor reaches the homepage CTA and keep
 * authenticated, owner, embedded-widget, and demo traffic out of Vercel's
 * public-site analytics stream.
 */
export function PublicWebAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    if (isPublicMarketingPath(pathname)) captureFirstTouch()
  }, [pathname])

  return <Analytics beforeSend={keepPublicEvent} />
}
