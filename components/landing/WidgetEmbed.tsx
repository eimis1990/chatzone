'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

export type WidgetLoadingPolicy = 'immediate' | 'idle' | 'interaction'

interface WidgetEmbedProps {
  botKey: string
  position?: 'bottom-left' | 'bottom-right'
  loadingPolicy?: WidgetLoadingPolicy
}

const LANDING_IDLE_DELAY_MS = 6000
const WIDGET_SELECTOR =
  '[data-cbz-launcher], [data-cbz-greeting], [data-cbz-wrapper], [data-cbz-pulse], script[data-cbz-embed]'

/**
 * Inject the customer-facing widget loader. Presentation routes use the default
 * immediate policy. The public landing page can defer it while showing a proxy
 * launcher that turns the visitor's first click into a real open-widget click.
 */
export function WidgetEmbed({
  botKey,
  position = 'bottom-right',
  loadingPolicy = 'immediate',
}: WidgetEmbedProps) {
  const [loaded, setLoaded] = useState(false)
  const loadWidgetRef = useRef<(openAfterLoad?: boolean) => void>(() => {})

  useEffect(() => {
    let disposed = false
    let delayId: ReturnType<typeof setTimeout> | undefined
    let idleId: number | undefined
    let script: HTMLScriptElement | null = null
    let openWhenReady = false

    const idleApi = window as unknown as {
      requestIdleCallback?: Window['requestIdleCallback']
      cancelIdleCallback?: Window['cancelIdleCallback']
    }

    const openRealLauncher = () => {
      const launcher = document.querySelector<HTMLButtonElement>('[data-cbz-launcher]')
      launcher?.click()
    }

    const loadWidget = (openAfterLoad = false) => {
      openWhenReady ||= openAfterLoad

      const existingLauncher = document.querySelector<HTMLButtonElement>('[data-cbz-launcher]')
      if (existingLauncher) {
        setLoaded(true)
        if (openWhenReady) existingLauncher.click()
        return
      }
      if (script) return

      script = document.createElement('script')
      script.src = '/widget.js'
      script.async = true
      script.setAttribute('data-bot-key', botKey)
      script.setAttribute('data-position', position)
      script.setAttribute('data-cbz-embed', '')
      script.addEventListener('load', () => {
        if (disposed) return
        setLoaded(true)
        if (openWhenReady) requestAnimationFrame(openRealLauncher)
      })
      script.addEventListener('error', () => {
        script?.remove()
        script = null
      })
      document.body.appendChild(script)
    }

    loadWidgetRef.current = loadWidget

    if (loadingPolicy === 'immediate') {
      loadWidget()
    } else if (loadingPolicy === 'idle') {
      delayId = setTimeout(() => {
        if (idleApi.requestIdleCallback) {
          idleId = idleApi.requestIdleCallback(() => loadWidget(), { timeout: 2000 })
        } else {
          loadWidget()
        }
      }, LANDING_IDLE_DELAY_MS)
    }

    return () => {
      disposed = true
      if (delayId !== undefined) clearTimeout(delayId)
      if (idleId !== undefined) idleApi.cancelIdleCallback?.(idleId)
      loadWidgetRef.current = () => {}
      document.querySelectorAll(WIDGET_SELECTOR).forEach((element) => element.remove())
    }
  }, [botKey, loadingPolicy, position])

  if (loadingPolicy === 'immediate' || loaded) return null

  const sideClass = position === 'bottom-left' ? 'left-5' : 'right-5'

  return (
    <button
      type="button"
      aria-label="Open chat"
      aria-haspopup="dialog"
      data-testid="deferred-widget-launcher"
      onClick={() => {
        trackEvent('landing_widget_launcher_clicked', { loadingPolicy })
        loadWidgetRef.current(true)
      }}
      className={`fixed bottom-5 ${sideClass} z-[2147483646] flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95`}
    >
      <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M6.5 5.5h11A2.5 2.5 0 0 1 20 8v6a2.5 2.5 0 0 1-2.5 2.5H12L8 19v-2.5H6.5A2.5 2.5 0 0 1 4 14V8a2.5 2.5 0 0 1 2.5-2.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </button>
  )
}
