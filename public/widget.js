/**
 * Chatzone Widget Loader
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
 *  5. When open: renders a "Powered by Chatzone" link below the iframe.
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
  var IFRAME_HEIGHT = 720
  var OFFSET = 20
  var Z_INDEX = 2147483647 // max z-index
  var POWERED_BY_URL = 'https://chatzone.app'

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
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    outline: 'none',
  })

  if (isRight) {
    launcher.style.right = OFFSET + 'px'
  } else {
    launcher.style.left = OFFSET + 'px'
  }

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
    width: IFRAME_WIDTH + 'px',
    display: 'none', // hidden until first open
    // Open/close animation (scale + fade from the launcher corner).
    opacity: '0',
    transform: 'translateY(12px) scale(0.96)',
    transformOrigin: isRight ? 'bottom right' : 'bottom left',
    transition: 'opacity 0.24s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'opacity, transform',
  })

  if (isRight) {
    wrapper.style.right = OFFSET + 'px'
  } else {
    wrapper.style.left = OFFSET + 'px'
  }

  // Position wrapper bottom so it sits above the launcher
  wrapper.style.bottom = (LAUNCHER_SIZE + OFFSET + 8) + 'px'

  // ── Iframe container ──────────────────────────────────────────────────────
  var iframeContainer = document.createElement('div')
  css(iframeContainer, {
    width: '100%',
    height: IFRAME_HEIGHT + 'px',
    borderRadius: '16px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  })

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
    'style="color:rgba(0,0,0,0.5);text-decoration:underline;font-family:inherit;">Chatzone</a>'

  wrapper.appendChild(iframeContainer)
  wrapper.appendChild(poweredBy)

  var iframe = null
  var isOpen = false

  function openWidget() {
    if (!iframe) {
      iframe = document.createElement('iframe')
      iframe.setAttribute('data-cbz-iframe', '')
      iframe.setAttribute('title', 'Chat')
      iframe.setAttribute('allow', 'clipboard-write; microphone; autoplay')
      iframe.setAttribute(
        'src',
        appUrl + '/embed/' + encodeURIComponent(botKey)
      )
      css(iframe, {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      })
      iframeContainer.appendChild(iframe)
    }
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
    wrapper.style.display = 'block'
    // Force a reflow so the transition runs from the hidden state, then animate in.
    void wrapper.offsetHeight
    wrapper.style.opacity = '1'
    wrapper.style.transform = 'translateY(0) scale(1)'
    isOpen = true
    launcher.setAttribute('aria-expanded', 'true')
    launcher.setAttribute('aria-label', 'Close chat')
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
    launcher.setAttribute('aria-expanded', 'false')
    launcher.setAttribute('aria-label', 'Open chat')
    renderLauncher()
  }

  // Paints the launcher from config: theme color + contrast, optional company
  // logo, and circle vs. pill (with label). Shows an X while the chat is open.
  function renderLauncher() {
    var theme = (config && config.theme) || {}
    var pc = theme.primaryColor || '#6366f1'
    launcher.style.backgroundColor = pc
    launcher.style.color = readable(pc)

    var label = theme.launcherLabel || ''
    var asPill = theme.launcherStyle === 'pill' && !!label && !isOpen
    var showLogo = !!theme.launcherShowLogo && !!(config && config.avatarUrl)

    var iconHtml
    if (isOpen) {
      iconHtml = CLOSE_ICON
    } else if (showLogo) {
      iconHtml =
        '<img src="' + config.avatarUrl + '" alt="" ' +
        'style="width:30px;height:30px;border-radius:50%;object-fit:cover;display:block" />'
    } else {
      iconHtml = CHAT_ICON
    }

    if (asPill) {
      css(launcher, {
        width: 'auto',
        height: '52px',
        borderRadius: '26px',
        padding: '0 18px 0 14px',
        gap: '8px',
      })
      launcher.innerHTML =
        iconHtml +
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
      })
      launcher.innerHTML = iconHtml
    }
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

  // ── Mount ─────────────────────────────────────────────────────────────────
  renderLauncher()
  document.body.appendChild(wrapper)
  document.body.appendChild(launcher)

  // Fetch theme/launcher config and repaint the launcher once it arrives.
  try {
    fetch(appUrl + '/api/widget-config?key=' + encodeURIComponent(botKey))
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (c) {
        if (c) {
          config = c
          renderLauncher()
        }
      })
      .catch(function () {})
  } catch (_) {
    // Non-critical — launcher keeps its default look.
  }
})()
