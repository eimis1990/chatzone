/**
 * widget-loader.test.ts
 *
 * Tests for public/widget.js in a jsdom environment.
 * We read the JS file content and execute it via Function() to simulate
 * how a browser loads the script.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { JSDOM } from 'jsdom'

const widgetSrc = readFileSync(resolve(process.cwd(), 'public/widget.js'), 'utf8')

function setupDOM(botKey: string, position = 'bottom-right') {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://example.com',
    runScripts: 'dangerously',
    resources: 'usable',
  })

  const { window } = dom
  const { document } = window

  // Simulate the <script> tag the customer pastes
  const script = document.createElement('script')
  script.setAttribute('data-bot-key', botKey)
  script.setAttribute('data-position', position)
  // src origin is used to derive APP_URL; we point it at a mock origin
  script.setAttribute('src', 'https://app.chatbotzone.com/widget.js')
  document.head.appendChild(script)

  // Execute the widget.js script in the jsdom context
  // We wrap it so `document.currentScript` would return our script element.
  // jsdom does not automatically set currentScript, so we patch it.
  Object.defineProperty(document, 'currentScript', {
    get: () => script,
    configurable: true,
  })

  // Run the script code
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'document', widgetSrc)
  fn(window, document)

  return { dom, window, document }
}

describe('widget.js loader', () => {
  it('creates a launcher button in the DOM', () => {
    const { document } = setupDOM('TEST_KEY_123')
    const launcher = document.querySelector('[data-cbz-launcher]')
    expect(launcher).not.toBeNull()
    expect(launcher?.tagName).toBe('BUTTON')
  })

  it('launcher button has an accessible label', () => {
    const { document } = setupDOM('TEST_KEY_123')
    const launcher = document.querySelector('[data-cbz-launcher]')
    expect(
      launcher?.getAttribute('aria-label') ||
        launcher?.textContent?.trim()
    ).toBeTruthy()
  })

  it('does NOT mount an iframe before the launcher is clicked', () => {
    const { document } = setupDOM('TEST_KEY_456')
    const iframe = document.querySelector('[data-cbz-iframe]')
    expect(iframe).toBeNull()
  })

  it('mounts an iframe whose src contains /embed/KEY after launcher click', () => {
    const { document } = setupDOM('MY_BOT_KEY')
    const launcher = document.querySelector<HTMLElement>('[data-cbz-launcher]')
    expect(launcher).not.toBeNull()

    launcher!.click()

    const iframe = document.querySelector<HTMLIFrameElement>('[data-cbz-iframe]')
    expect(iframe).not.toBeNull()
    expect(iframe!.src).toContain('/embed/MY_BOT_KEY')
  })

  it('derives the embed URL from the script src origin', () => {
    const { document } = setupDOM('ACME_KEY')
    const launcher = document.querySelector<HTMLElement>('[data-cbz-launcher]')
    launcher!.click()

    const iframe = document.querySelector<HTMLIFrameElement>('[data-cbz-iframe]')
    // origin should be the same as the script src
    expect(iframe!.src).toMatch(/^https:\/\/app\.chatbotzone\.com\/embed\/ACME_KEY/)
  })

  it('toggles the widget open/closed on repeated clicks', () => {
    vi.useFakeTimers()
    try {
      const { document } = setupDOM('TOGGLE_KEY')
      const launcher = document.querySelector<HTMLElement>('[data-cbz-launcher]')
      const wrapper = document.querySelector<HTMLElement>('[data-cbz-wrapper]')

      // First click — open (shown immediately, animates in). The wrapper is a
      // flex column (iframe + powered-by) so it can stretch to full-screen on mobile.
      launcher!.click()
      expect(wrapper?.style.display).toBe('flex')
      expect(launcher?.getAttribute('aria-expanded')).toBe('true')

      // Second click — close (animates out, then hides after the transition)
      launcher!.click()
      expect(launcher?.getAttribute('aria-expanded')).toBe('false')
      vi.advanceTimersByTime(350)
      expect(wrapper?.style.display).toBe('none')

      // Third click — open again (cancels any pending hide)
      launcher!.click()
      expect(wrapper?.style.display).toBe('flex')
      expect(launcher?.getAttribute('aria-expanded')).toBe('true')
    } finally {
      vi.useRealTimers()
    }
  })
})
