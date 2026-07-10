/**
 * Loqara Widget Loader
 *
 * Plain vanilla JS — NO build step, NO imports.
 * Customers paste:
 *   <script src="https://app.chatbotzone.com/widget.js"
 *           data-bot-key="PUBLIC_KEY"
 *           async></script>
 *
 * This script:
 *  1. Reads data-bot-key (and optional data-position) from its own <script> tag.
 *  2. Injects a floating launcher <button> into the page.
 *  3. On first click, lazy-creates an <iframe> pointed at /embed/{key}.
 *  4. Toggles open/close on subsequent launcher clicks.
 *  5. When open: renders a "Powered by Loqara" link below the iframe.
 */
;(function () {
  'use strict'

  // ── Resolve own <script> tag ──────────────────────────────────────────────
  // document.currentScript is null for async scripts by the time they execute,
  // so we also search by src suffix as a fallback.
  var script =
    document.currentScript ||
    (function () {
      var scripts = document.querySelectorAll('script[data-bot-key]')
      return scripts[scripts.length - 1] || null
    })()

  if (!script) return

  var botKey = script.getAttribute('data-bot-key')
  if (!botKey) return

  var position = script.getAttribute('data-position') || 'bottom-right'

  // Bot config (theme, logo, launcher options) — fetched after mount.
  var config = null

  // Derive APP_URL from the script's own src origin (same host that serves widget.js)
  var appUrl = ''
  var src = script.getAttribute('src') || ''
  try {
    var srcUrl = new URL(src)
    appUrl = srcUrl.origin
  } catch (_) {
    // Relative src — use current page origin as fallback
    appUrl = window.location.origin
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  var LAUNCHER_SIZE = 56
  var IFRAME_WIDTH = 420
  // At/below this viewport width the panel becomes a near-full-screen sheet.
  var MOBILE_BP = 640
  // Keep this in sync with the preview cap in components/client/TestChat.tsx so
  // the embedded widget matches exactly what the owner sees in the configurator.
  var IFRAME_HEIGHT = 680
  var OFFSET = 20
  var Z_INDEX = 2147483647 // max z-index
  var POWERED_BY_URL = 'https://www.loqara.com'

  var isRight = position !== 'bottom-left'

  function css(el, styles) {
    for (var k in styles) {
      if (Object.prototype.hasOwnProperty.call(styles, k)) {
        el.style[k] = styles[k]
      }
    }
  }

  // ── Launcher button ───────────────────────────────────────────────────────
  var launcher = document.createElement('button')
  launcher.setAttribute('data-cbz-launcher', '')
  launcher.setAttribute('type', 'button')
  launcher.setAttribute('aria-label', 'Open chat')
  launcher.setAttribute('aria-haspopup', 'dialog')
  launcher.setAttribute('aria-expanded', 'false')

  css(launcher, {
    position: 'fixed',
    bottom: OFFSET + 'px',
    zIndex: Z_INDEX,
    width: LAUNCHER_SIZE + 'px',
    height: LAUNCHER_SIZE + 'px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    lineHeight: '1',
    // Start hidden so the visitor never sees the placeholder color: the launcher
    // fades in once its real theme color is known (see revealLauncher()).
    opacity: '0',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s ease',
    outline: 'none',
  })

  if (isRight) {
    launcher.style.right = OFFSET + 'px'
  } else {
    launcher.style.left = OFFSET + 'px'
  }

  // ── Pulse rings ─────────────────────────────────────────────────────────
  // Two expanding, fading circles behind the launcher (circle style only).
  // Injected once; shown/hidden + colored by renderLauncher().
  var pulseStyleInjected = false
  function ensurePulseKeyframes() {
    if (pulseStyleInjected) return
    pulseStyleInjected = true
    var st = document.createElement('style')
    st.textContent =
      '@keyframes cbz-pulse{0%{transform:scale(1);opacity:0}82.9%{transform:scale(1);opacity:0}83%{transform:scale(1);opacity:.5}100%{transform:scale(2.2);opacity:0}}' +
      '@keyframes cbz-breathe{0%{transform:scale(1)}83%{transform:scale(.9)}88%{transform:scale(1.03)}93%{transform:scale(1)}100%{transform:scale(1)}}'
    document.head.appendChild(st)
  }
  function makeRing(delay) {
    var r = document.createElement('span')
    r.setAttribute('data-cbz-pulse', '')
    css(r, {
      position: 'fixed',
      bottom: OFFSET + 'px',
      width: LAUNCHER_SIZE + 'px',
      height: LAUNCHER_SIZE + 'px',
      borderRadius: '50%',
      zIndex: Z_INDEX - 1,
      pointerEvents: 'none',
      display: 'none',
      // Invisible during the 5s shrink (opacity 0 in the keyframe), then radiates
      // out over the last ~1s — firing exactly on the button's spring-back.
      animation: 'cbz-pulse 6s ease-out infinite',
      animationDelay: delay,
      animationFillMode: 'backwards',
    })
    r.style[isRight ? 'right' : 'left'] = OFFSET + 'px'
    return r
  }
  // Second ring 0.25s behind the first = a tight double wave on the bounce.
  var pulseRings = [makeRing('0s'), makeRing('0.25s')]

  // Launcher icons (themed by renderLauncher via currentColor).
  var CHAT_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26" aria-hidden="true">' +
    '<path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />' +
    '<path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />' +
    '</svg>'
  var CLOSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.5" stroke-linecap="round" width="24" height="24" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18" /></svg>'
  // Match the configurator greeting preview's Lucide X (16px, 2px stroke).
  // Keep this separate from CLOSE_ICON, which is intentionally larger inside
  // the launcher button when chat is open.
  var GREETING_CLOSE_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" ' +
    'style="display:block;width:16px;height:16px" aria-hidden="true">' +
    '<path d="M18 6 6 18M6 6l12 12" /></svg>'

  // ── Proactive greeting ─────────────────────────────────────────────────
  // A small, dismissible prompt above the closed launcher. It lives in the
  // host page (not the lazy iframe), so it can appear before chat is opened.
  var proactiveGreeting = document.createElement('div')
  proactiveGreeting.setAttribute('data-cbz-greeting', '')
  proactiveGreeting.setAttribute('role', 'status')
  proactiveGreeting.setAttribute('aria-live', 'polite')
  css(proactiveGreeting, {
    position: 'fixed',
    bottom: OFFSET + LAUNCHER_SIZE + 12 + 'px',
    zIndex: Z_INDEX,
    width: 'min(280px, calc(100vw - 40px))',
    display: 'none',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
    opacity: '0',
    transform: 'translateY(8px) scale(0.97)',
    transformOrigin: isRight ? 'bottom right' : 'bottom left',
    transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
  })
  proactiveGreeting.style[isRight ? 'right' : 'left'] = OFFSET + 'px'

  var proactiveMessageButton = document.createElement('button')
  proactiveMessageButton.setAttribute('type', 'button')
  css(proactiveMessageButton, {
    minWidth: '0',
    minHeight: '48px',
    flex: '1 1 auto',
    padding: '12px 8px 12px 16px',
    border: '0',
    background: 'transparent',
    color: 'inherit',
    font: 'inherit',
    fontSize: '14px',
    lineHeight: '20px',
    textAlign: 'left',
    cursor: 'pointer',
  })

  var proactiveDismiss = document.createElement('button')
  proactiveDismiss.setAttribute('type', 'button')
  proactiveDismiss.setAttribute('aria-label', 'Dismiss greeting')
  proactiveDismiss.innerHTML = GREETING_CLOSE_ICON
  css(proactiveDismiss, {
    width: '44px',
    height: '44px',
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    border: '0',
    borderRadius: '50%',
    background: 'transparent',
    color: 'inherit',
    opacity: '0.6',
    cursor: 'pointer',
  })

  var proactiveTail = document.createElement('span')
  proactiveTail.setAttribute('aria-hidden', 'true')
  css(proactiveTail, {
    position: 'absolute',
    bottom: '-6px',
    width: '12px',
    height: '12px',
    transform: 'rotate(45deg)',
  })
  proactiveTail.style[isRight ? 'right' : 'left'] = '22px'

  proactiveGreeting.appendChild(proactiveMessageButton)
  proactiveGreeting.appendChild(proactiveDismiss)
  proactiveGreeting.appendChild(proactiveTail)

  var proactiveTimer = null
  var proactiveHideTimer = null
  var proactiveVisible = false

  function greetingFont(fontKey, chatFontKey) {
    var key = fontKey === 'inherit' ? chatFontKey : fontKey
    var stacks = {
      geist: 'Geist, system-ui, -apple-system, sans-serif',
      inter: 'Inter, system-ui, -apple-system, sans-serif',
      poppins: 'Poppins, system-ui, -apple-system, sans-serif',
      nunito: 'Nunito, system-ui, -apple-system, sans-serif',
      jakarta: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
      lora: 'Lora, Georgia, serif',
    }
    return stacks[key] || 'system-ui, -apple-system, sans-serif'
  }

  function dismissProactiveGreeting() {
    if (proactiveTimer) {
      clearTimeout(proactiveTimer)
      proactiveTimer = null
    }
    if (proactiveHideTimer) clearTimeout(proactiveHideTimer)
    proactiveVisible = false
    proactiveGreeting.style.opacity = '0'
    proactiveGreeting.style.transform = 'translateY(4px) scale(0.98)'
    proactiveHideTimer = setTimeout(function () {
      if (!proactiveVisible) proactiveGreeting.style.display = 'none'
      proactiveHideTimer = null
    }, 220)
  }

  function showProactiveGreeting(settings) {
    if (isOpen || !settings || !settings.messages || !settings.messages.length) return
    var message = settings.messages[Math.floor(Math.random() * settings.messages.length)]
    if (!message) return

    proactiveMessageButton.textContent = message
    proactiveGreeting.style.backgroundColor = settings.backgroundColor || '#ffffff'
    proactiveGreeting.style.color = settings.textColor || '#111827'
    proactiveGreeting.style.borderRadius = (settings.cornerRadius || 0) + 'px'
    proactiveGreeting.style.fontFamily = greetingFont(
      settings.fontFamily,
      config && config.theme && config.theme.fontFamily
    )
    proactiveTail.style.backgroundColor = settings.backgroundColor || '#ffffff'
    proactiveGreeting.style.display = 'flex'
    proactiveVisible = true

    try {
      if (settings.frequency === 'once_per_session') {
        window.sessionStorage.setItem('cbz_greeting_' + botKey, '1')
      }
    } catch {}

    var reducedMotion =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) {
      proactiveGreeting.style.transition = 'none'
      proactiveGreeting.style.opacity = '1'
      proactiveGreeting.style.transform = 'none'
    } else {
      var animateGreeting = window.requestAnimationFrame || function (callback) { setTimeout(callback, 0) }
      animateGreeting(function () {
        proactiveGreeting.style.opacity = '1'
        proactiveGreeting.style.transform = 'translateY(0) scale(1)'
      })
    }
  }

  function scheduleProactiveGreeting() {
    var settings = config && config.proactiveGreeting
    if (!settings || !settings.enabled || !settings.messages || !settings.messages.length) return
    if (settings.frequency === 'once_per_session') {
      try {
        if (window.sessionStorage.getItem('cbz_greeting_' + botKey)) return
      } catch {}
    }
    proactiveTimer = setTimeout(function () {
      proactiveTimer = null
      showProactiveGreeting(settings)
    }, Math.max(0, settings.delaySeconds || 0) * 1000)
  }

  proactiveMessageButton.addEventListener('click', function () {
    dismissProactiveGreeting()
    openWidget()
  })
  proactiveDismiss.addEventListener('click', dismissProactiveGreeting)

  // Near-black or white, whichever reads better on the launcher color.
  function readable(hex) {
    var h = String(hex || '').replace('#', '')
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    if (h.length !== 6) return '#ffffff'
    var r = parseInt(h.slice(0, 2), 16)
    var g = parseInt(h.slice(2, 4), 16)
    var b = parseInt(h.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#111827' : '#ffffff'
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  // ── Iframe wrapper ────────────────────────────────────────────────────────
  var wrapper = document.createElement('div')
  wrapper.setAttribute('data-cbz-wrapper', '')
  css(wrapper, {
    position: 'fixed',
    zIndex: Z_INDEX,
    // A flex column so the iframe container can flex to fill on mobile while
    // the "Powered by" line keeps its natural height. Size is set by
    // sizeWidget() (responsive) rather than fixed here.
    display: 'none', // hidden until first open (flex applied on open)
    flexDirection: 'column',
    // Open/close animation (scale + fade from the launcher corner).
    opacity: '0',
    transform: 'translateY(12px) scale(0.96)',
    transformOrigin: isRight ? 'bottom right' : 'bottom left',
    transition: 'opacity 0.24s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'opacity, transform',
  })

  // ── Iframe container ──────────────────────────────────────────────────────
  var iframeContainer = document.createElement('div')
  css(iframeContainer, {
    width: '100%',
    borderRadius: '16px', // updated from config.theme.cornerRadius once loaded
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  })

  // Responsive sizing: a floating card on desktop, a near-full-screen sheet on
  // phones. Re-run on resize/rotate so it adapts live.
  function isMobile() {
    return window.innerWidth <= MOBILE_BP
  }
  function sizeWidget() {
    if (isMobile()) {
      // True full screen — max real estate for the on-screen keyboard. Edge to
      // edge, no radius/shadow; the in-header ✕ (rendered by ChatWindow) closes it.
      wrapper.style.width = 'auto'
      wrapper.style.left = '0px'
      wrapper.style.right = '0px'
      wrapper.style.top = '0px'
      wrapper.style.bottom = '0px'
      iframeContainer.style.flex = '1 1 auto'
      iframeContainer.style.minHeight = '0'
      iframeContainer.style.height = 'auto'
      iframeContainer.style.borderRadius = '0px'
      iframeContainer.style.boxShadow = 'none'
      poweredBy.style.display = 'none'
    } else {
      wrapper.style.width = IFRAME_WIDTH + 'px'
      wrapper.style.top = 'auto'
      wrapper.style.left = 'auto'
      wrapper.style.right = 'auto'
      wrapper.style[isRight ? 'right' : 'left'] = OFFSET + 'px'
      wrapper.style.bottom = LAUNCHER_SIZE + OFFSET + 8 + 'px'
      iframeContainer.style.flex = '0 0 auto'
      iframeContainer.style.minHeight = ''
      // Cap to the viewport so it never overflows short screens (matches preview).
      iframeContainer.style.height = 'min(' + IFRAME_HEIGHT + 'px, calc(100dvh - 112px))'
      iframeContainer.style.boxShadow = '0 8px 40px rgba(0,0,0,0.18)'
      poweredBy.style.display = config && config.hideBadge ? 'none' : ''
      // borderRadius restored below from config.cornerRadius (or its 16px default).
      iframeContainer.style.borderRadius =
        (config && config.theme && typeof config.theme.cornerRadius === 'number'
          ? config.theme.cornerRadius
          : 16) + 'px'
    }
    // Keep launcher visibility correct across a rotation/resize while open.
    if (isOpen) launcher.style.display = isMobile() ? 'none' : 'flex'
    // Keep the iframe's header (✕ vs avatar) in sync across rotation/resize.
    sendViewport()
  }

  // ── Powered-by link (below the iframe, right-aligned) ─────────────────────
  // No separate close button: the launcher bubble toggles open/close.
  var poweredBy = document.createElement('div')
  css(poweredBy, {
    textAlign: 'right',
    marginTop: '8px',
    paddingRight: '2px',
    fontSize: '10px',
    color: 'rgba(0,0,0,0.35)',
    lineHeight: '1.4',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  })
  poweredBy.innerHTML =
    'Powered by <a href="' + POWERED_BY_URL + '" target="_blank" rel="noopener noreferrer" ' +
    'style="color:rgba(0,0,0,0.5);text-decoration:underline;font-family:inherit;">Loqara</a>'

  wrapper.appendChild(iframeContainer)
  wrapper.appendChild(poweredBy)

  // Size the wrapper now that all its children exist (sizeWidget reads poweredBy).
  sizeWidget()
  window.addEventListener('resize', sizeWidget)

  var iframe = null
  var isOpen = false

  // Tell the iframe whether we're a full-screen mobile sheet, so its header can
  // show a ✕ instead of the avatar. The iframe can't tell on its own — its own
  // width is always narrow regardless of the outer viewport.
  function sendViewport() {
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: 'cbz-viewport', mobile: isMobile() },
        '*'
      )
    }
  }

  function openWidget() {
    dismissProactiveGreeting()
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.setAttribute('data-cbz-iframe', '')
      iframe.setAttribute('title', 'Chat')
      iframe.setAttribute('allow', 'clipboard-write; microphone; autoplay')
      // Pass the accent color (if config already loaded) so the embed's loading
      // indicator is themed from the first frame, before it fetches config itself.
      var loaderTheme = (config && config.theme) || {}
      var loaderColor = loaderTheme.launcherColor || loaderTheme.primaryColor
      iframe.setAttribute(
        'src',
        appUrl +
          '/embed/' +
          encodeURIComponent(botKey) +
          (loaderColor ? '?c=' + encodeURIComponent(loaderColor.replace('#', '')) : '')
      )
      css(iframe, {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      })
      iframe.addEventListener('load', sendViewport)
      iframeContainer.appendChild(iframe)
    }
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    sizeWidget() // re-apply responsive sizing in case the viewport changed while closed
    wrapper.style.display = 'flex'
    // Force a reflow so the transition runs from the hidden state, then animate in.
    void wrapper.offsetHeight
    wrapper.style.opacity = '1'
    wrapper.style.transform = 'translateY(0) scale(1)'
    isOpen = true
    launcher.setAttribute('aria-expanded', 'true')
    launcher.setAttribute('aria-label', 'Close chat')
    // On mobile the panel is full screen with its own in-header ✕, so hide the
    // floating launcher (it would cover the composer). Desktop keeps it.
    if (isMobile()) launcher.style.display = 'none'
    renderLauncher()
  }

  var closeTimer = null

  function closeWidget() {
    // Animate out, then hide after the transition.
    wrapper.style.opacity = '0'
    wrapper.style.transform = 'translateY(12px) scale(0.96)'
    if (closeTimer) clearTimeout(closeTimer)
    closeTimer = setTimeout(function () {
      if (!isOpen) wrapper.style.display = 'none'
      closeTimer = null
    }, 300)
    isOpen = false
    launcher.style.display = 'flex' // restore (was hidden on mobile while open)
    launcher.setAttribute('aria-expanded', 'false')
    launcher.setAttribute('aria-label', 'Open chat')
    renderLauncher()
  }

  // Paints the launcher from config: theme color + contrast, optional company
  // logo, and circle vs. pill (with label). Shows an X while the chat is open.
  function renderLauncher() {
    var theme = (config && config.theme) || {}
    var pc = theme.launcherColor || theme.primaryColor || '#6366f1'
    launcher.style.backgroundColor = pc
    launcher.style.color = readable(pc)

    // Pulse rings + button breathing: circle style only, never while chat is open.
    var doPulse = !!theme.launcherPulse && theme.launcherStyle !== 'pill' && !isOpen
    if (doPulse) ensurePulseKeyframes()
    for (var ri = 0; ri < pulseRings.length; ri++) {
      pulseRings[ri].style.backgroundColor = pc
      pulseRings[ri].style.display = doPulse ? 'block' : 'none'
    }
    // The launcher slowly shrinks (~5s) then springs back — the wave fires on
    // that spring-back (same 6s cycle, see cbz-pulse rings above).
    launcher.style.animation = doPulse ? 'cbz-breathe 6s ease-in-out infinite' : ''

    var label = theme.launcherLabel || ''
    var asPill = theme.launcherStyle === 'pill' && !!label && !isOpen
    var showLogo = !!theme.launcherShowLogo && !!(config && config.avatarUrl)

    // Logo image. `fill` = fill the whole circular launcher (edge to edge);
    // otherwise a small badge that sits next to the pill label.
    function logoImg(fill) {
      var s = fill
        ? 'width:100%;height:100%;border-radius:50%;object-fit:cover;display:block'
        : 'width:28px;height:28px;border-radius:50%;object-fit:cover;display:block'
      return '<img src="' + config.avatarUrl + '" alt="" style="' + s + '" />'
    }

    if (asPill) {
      css(launcher, {
        width: 'auto',
        height: '52px',
        borderRadius: '26px',
        padding: '0 18px 0 14px',
        gap: '8px',
        overflow: 'visible',
      })
      launcher.innerHTML =
        (showLogo ? logoImg(false) : CHAT_ICON) +
        '<span style="font-size:15px;font-weight:600;white-space:nowrap;' +
        'font-family:system-ui,-apple-system,sans-serif">' +
        escapeHtml(label) +
        '</span>'
    } else {
      css(launcher, {
        width: LAUNCHER_SIZE + 'px',
        height: LAUNCHER_SIZE + 'px',
        borderRadius: '50%',
        padding: '0',
        gap: '0',
        // Clip a filling logo to a crisp circle.
        overflow: showLogo && !isOpen ? 'hidden' : 'visible',
      })
      launcher.innerHTML = isOpen ? CLOSE_ICON : showLogo ? logoImg(true) : CHAT_ICON
    }
  }

  // Fade the launcher in once its real theme color is known (or on fallback),
  // so the placeholder color never flashes on first paint / reload.
  var launcherRevealed = false
  function revealLauncher() {
    if (launcherRevealed) return
    launcherRevealed = true
    launcher.style.opacity = '1'
  }

  launcher.addEventListener('click', function () {
    if (isOpen) {
      closeWidget()
    } else {
      openWidget()
    }
  })

  // Keyboard: close on Escape when widget is open
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) closeWidget()
  })

  // The in-iframe header ✕ (mobile) asks us to close via postMessage. Only trust
  // messages coming from our own iframe's window.
  window.addEventListener('message', function (e) {
    if (!iframe || e.source !== iframe.contentWindow || !e.data) return
    if (e.data.type === 'cbz-close') {
      closeWidget()
    } else if (e.data.type === 'cbz-ready') {
      // Iframe mounted and is asking for the current viewport.
      sendViewport()
    }
  })

  // ── Mount ─────────────────────────────────────────────────────────────────
  renderLauncher()
  document.body.appendChild(wrapper)
  document.body.appendChild(pulseRings[0])
  document.body.appendChild(pulseRings[1])
  document.body.appendChild(proactiveGreeting)
  document.body.appendChild(launcher)

  // Safety net: reveal with the default look if config is slow or unreachable,
  // so the launcher never stays invisible.
  var revealTimer = setTimeout(revealLauncher, 1500)

  // Fetch theme/launcher config and repaint the launcher once it arrives.
  try {
    fetch(appUrl + '/api/widget-config?key=' + encodeURIComponent(botKey))
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (c) {
        if (c) {
          config = c
          // Match the chat window's configured corner radius.
          if (c.theme && typeof c.theme.cornerRadius === 'number') {
            iframeContainer.style.borderRadius = c.theme.cornerRadius + 'px'
          }
          // Paid plans hide the "Powered by Loqara" badge.
          if (c.hideBadge) {
            poweredBy.style.display = 'none'
          }
          renderLauncher()
          scheduleProactiveGreeting()
        }
      })
      .catch(function () {})
      .then(function () {
        clearTimeout(revealTimer)
        revealLauncher()
      })
  } catch (_) {
    // Non-critical — launcher keeps its default look.
    clearTimeout(revealTimer)
    revealLauncher()
  }
})()
