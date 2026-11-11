'use client'

import type { ReactNode } from 'react'
import { trackEvent } from '@/lib/analytics'

/**
 * Opens the real Loqara widget embedded on the landing page (WidgetEmbed): the
 * page's own proof that the product works. Clicks the widget's launcher, or the
 * deferred stand-in if the widget has not loaded yet; never closes an open chat.
 */
export function LiveChatButton({
  location,
  className,
  children,
}: {
  /** Where the button sits, for analytics. */
  location: string
  className?: string
  children: ReactNode
}) {
  const open = () => {
    trackEvent('live_demo_opened', { location })
    const launcher = document.querySelector<HTMLButtonElement>('[data-cbz-launcher]')
    if (launcher) {
      if (launcher.getAttribute('aria-expanded') !== 'true') launcher.click()
      return
    }
    document.querySelector<HTMLButtonElement>('[data-open-chat]')?.click()
  }

  return (
    <button type="button" className={className} onClick={open}>
      {children}
    </button>
  )
}
