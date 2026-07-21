'use client'

import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics'
import { LAUNCHER_ICONS, type LauncherIconKey } from '@/lib/launcher-icons'
import type { LandingLauncherTheme } from '@/lib/platform-bot'

export type WidgetLoadingPolicy = 'immediate' | 'idle' | 'interaction'

interface WidgetEmbedProps {
  botKey: string
  position?: 'bottom-left' | 'bottom-right'
  loadingPolicy?: WidgetLoadingPolicy
  /**
   * Real launcher theme (server-fetched) so the deferred proxy button is
   * pixel-identical to the widget.js launcher that replaces it — same color,
   * icon, and offsets. Without it the proxy falls back to brand defaults.
   * ponytail: circle style only — if the bot ever uses a pill launcher the
   * proxy still renders a circle for the ~6s before widget.js takes over.
   */
  launcher?: LandingLauncherTheme
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
  launcher,
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

    // The real launcher mounts invisible and only fades in once its theme
    // config arrives (widget.js revealLauncher). Keep the proxy on screen until
    // the real button is MEASURED fully opaque — events and timers both proved
    // racy against the config fetch, so poll the rendered state instead. The
    // two buttons are pixel-identical, so the brief overlap is invisible. The
    // 10s cap only guards against a widget.js that never reveals (it has its
    // own 1.5s reveal safety net, so the cap should never fire in practice).
    let watchId: ReturnType<typeof setInterval> | undefined
    const watchRealLauncher = () => {
      if (watchId !== undefined) return
      const startedAt = Date.now()
      watchId = setInterval(() => {
        const real = document.querySelector('[data-cbz-launcher]')
        const revealed = real && Number(getComputedStyle(real).opacity) >= 0.99
        if (revealed || Date.now() - startedAt > 10_000) {
          clearInterval(watchId)
          if (!disposed) setLoaded(true)
        }
      }, 100)
    }
    window.addEventListener('cbz:launcher-revealed', watchRealLauncher)

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
        watchRealLauncher()
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
      window.removeEventListener('cbz:launcher-revealed', watchRealLauncher)
      if (watchId !== undefined) clearInterval(watchId)
      if (delayId !== undefined) clearTimeout(delayId)
      if (idleId !== undefined) idleApi.cancelIdleCallback?.(idleId)
      loadWidgetRef.current = () => {}
      document.querySelectorAll(WIDGET_SELECTOR).forEach((element) => element.remove())
    }
  }, [botKey, loadingPolicy, position])

  if (loadingPolicy === 'immediate' || loaded) return null

  // Mirror widget.js renderLauncher(): same 56px circle, same color chain,
  // same icon set, same viewport offsets — so the real launcher replacing this
  // proxy is visually a no-op.
  const iconSvg =
    LAUNCHER_ICONS[(launcher?.icon ?? 'chat') as LauncherIconKey] ?? LAUNCHER_ICONS.chat
  const bottom = launcher?.bottom ?? 20
  const side = launcher?.side ?? 20

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
      style={{
        bottom: `${bottom}px`,
        [position === 'bottom-left' ? 'left' : 'right']: `${side}px`,
        backgroundColor: launcher?.color ?? 'var(--primary)',
        color: launcher?.iconColor ?? '#ffffff',
      }}
      className="fixed z-[2147483646] flex size-14 items-center justify-center rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95"
    >
      <span aria-hidden="true" className="flex" dangerouslySetInnerHTML={{ __html: iconSvg }} />
    </button>
  )
}
