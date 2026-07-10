'use client'

import { useEffect } from 'react'

/**
 * Injects the real embed loader (public/widget.js) so the live bot appears on
 * the landing page — same-origin, exactly as a customer would embed it.
 */
export function WidgetEmbed({ botKey, position = 'bottom-right' }: { botKey: string; position?: string }) {
  useEffect(() => {
    if (document.querySelector('script[data-cbz-embed]')) return
    const s = document.createElement('script')
    s.src = '/widget.js'
    s.async = true
    s.setAttribute('data-bot-key', botKey)
    s.setAttribute('data-position', position)
    s.setAttribute('data-cbz-embed', '')
    document.body.appendChild(s)

    // Tear down on unmount (e.g. navigating into the app) — widget.js appends
    // the launcher, greeting, and iframe to <body>, outside React, so remove
    // the complete widget surface explicitly.
    return () => {
      document
        .querySelectorAll(
          '[data-cbz-launcher], [data-cbz-greeting], [data-cbz-wrapper], [data-cbz-pulse], script[data-cbz-embed]',
        )
        .forEach((el) => el.remove())
    }
  }, [botKey, position])

  return null
}
