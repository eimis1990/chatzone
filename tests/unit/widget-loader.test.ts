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

function setupDOM(botKey: string, position = 'bottom-right', widgetConfig?: unknown) {
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

  const fetchMock = widgetConfig
    ? vi.fn().mockResolvedValue({ ok: true, json: async () => widgetConfig })
    : vi.fn().mockResolvedValue({ ok: false })
  window.fetch = fetchMock as unknown as typeof window.fetch

  // Run the script code
  // eslint-disable-next-line no-new-func
  const fn = new Function('window', 'document', 'fetch', widgetSrc)
  fn(window, document, fetchMock)

  return { dom, window, document }
}

async function flushPromises() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
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

  it('renders no host-page Powered-by badge (it lives inside the iframe now)', () => {
    const { document } = setupDOM('TEST_KEY_123')
    const poweredBy = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) => link.textContent?.includes('Powered by'),
    )
    expect(poweredBy).toBeUndefined()
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

  it('paints the lazy iframe with the configured background from its first frame', async () => {
    const { document } = setupDOM('DARK_BOT', 'bottom-right', {
      theme: {
        primaryColor: '#f2762e',
        launcherColor: '#d95d18',
        backgroundColor: '#0f2420',
      },
    })
    await flushPromises()

    document.querySelector<HTMLElement>('[data-cbz-launcher]')!.click()

    const iframe = document.querySelector<HTMLIFrameElement>('[data-cbz-iframe]')!
    const frameUrl = new URL(iframe.src)
    const container = iframe.parentElement as HTMLElement
    expect(frameUrl.searchParams.get('c')).toBe('d95d18')
    expect(frameUrl.searchParams.get('bg')).toBe('0f2420')
    expect(iframe.style.backgroundColor).toBe('rgb(15, 36, 32)')
    expect(container.style.backgroundColor).toBe('rgb(15, 36, 32)')
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

  it('shows a configured proactive greeting above the launcher and opens chat on click', async () => {
    vi.useFakeTimers()
    try {
      const { document, window } = setupDOM('GREETING_KEY', 'bottom-right', {
        theme: { primaryColor: '#6366f1', position: 'bottom-right' },
        proactiveGreeting: {
          enabled: true,
          delaySeconds: 0,
          frequency: 'once_per_session',
          messages: ['Welcome! How can we help?'],
          backgroundColor: '#123456',
          textColor: '#ffffff',
          cornerRadius: 18,
          fontFamily: 'inherit',
        },
      })
      await flushPromises()
      await vi.advanceTimersByTimeAsync(0)

      const greeting = document.querySelector<HTMLElement>('[data-cbz-greeting]')
      expect(greeting?.style.display).toBe('flex')
      expect(greeting?.style.backgroundColor).toBe('rgb(18, 52, 86)')
      expect(greeting?.textContent).toContain('Welcome! How can we help?')
      expect(window.sessionStorage.getItem('cbz_greeting_GREETING_KEY')).toBe('1')

      const dismissIcon = greeting?.querySelector<HTMLButtonElement>('[aria-label="Dismiss greeting"] svg')
      expect(dismissIcon?.getAttribute('width')).toBe('16')
      expect(dismissIcon?.getAttribute('height')).toBe('16')
      expect(dismissIcon?.getAttribute('stroke-width')).toBe('2')

      const openButton = greeting?.querySelector<HTMLButtonElement>('button:not([aria-label])')
      openButton?.click()
      expect(document.querySelector('[data-cbz-iframe]')).not.toBeNull()
      expect(greeting?.style.opacity).toBe('0')
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits for the configured greeting delay', async () => {
    vi.useFakeTimers()
    try {
      const { document } = setupDOM('DELAY_KEY', 'bottom-left', {
        theme: { primaryColor: '#6366f1', position: 'bottom-left' },
        proactiveGreeting: {
          enabled: true,
          delaySeconds: 5,
          frequency: 'every_page',
          messages: ['Need anything?'],
        },
      })
      await flushPromises()
      await vi.advanceTimersByTimeAsync(0)
      const greeting = document.querySelector<HTMLElement>('[data-cbz-greeting]')
      expect(greeting?.style.display).toBe('none')
      await vi.advanceTimersByTimeAsync(4999)
      expect(greeting?.style.display).toBe('none')
      await vi.advanceTimersByTimeAsync(1)
      expect(greeting?.style.display).toBe('flex')
      expect(greeting?.style.left).toBe('20px')
    } finally {
      vi.useRealTimers()
    }
  })

  it('a second script eval on the same page is a no-op (no duplicate launchers)', () => {
    const { window, document } = setupDOM('DUP_KEY')
    expect(document.querySelectorAll('[data-cbz-launcher]').length).toBe(1)

    // Re-run the loader in the same DOM (SPA remount racing the old instance,
    // or a customer pasting the snippet twice).
    // eslint-disable-next-line no-new-func
    const again = new Function('window', 'document', 'fetch', widgetSrc)
    again(window, document, window.fetch)

    expect(document.querySelectorAll('[data-cbz-launcher]').length).toBe(1)
  })

  it('canonicalizes a bare-apex loqara.com src to www (apex 308 has no CORS headers)', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      runScripts: 'dangerously',
      resources: 'usable',
    })
    const { window } = dom
    const { document } = window
    const script = document.createElement('script')
    script.setAttribute('data-bot-key', 'APEX_KEY')
    script.setAttribute('src', 'https://loqara.com/widget.js')
    document.head.appendChild(script)
    Object.defineProperty(document, 'currentScript', { get: () => script, configurable: true })
    const fetchMock = vi.fn().mockResolvedValue({ ok: false })
    window.fetch = fetchMock as unknown as typeof window.fetch

    // eslint-disable-next-line no-new-func
    const fn = new Function('window', 'document', 'fetch', widgetSrc)
    fn(window, document, fetchMock)
    await flushPromises()

    expect(fetchMock.mock.calls[0][0]).toMatch(/^https:\/\/www\.loqara\.com\/api\/widget-config/)
    document.querySelector<HTMLElement>('[data-cbz-launcher]')!.click()
    const iframe = document.querySelector<HTMLIFrameElement>('[data-cbz-iframe]')!
    expect(iframe.src).toMatch(/^https:\/\/www\.loqara\.com\/embed\/APEX_KEY/)
  })

  it('paints the launcher from the cached theme immediately on repeat visits', () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      runScripts: 'dangerously',
      resources: 'usable',
    })
    const { window } = dom
    const { document } = window
    window.localStorage.setItem(
      'cbz_theme_REPEAT_KEY',
      JSON.stringify({ theme: { launcherColor: '#c04b0c' }, avatarUrl: '' }),
    )
    const script = document.createElement('script')
    script.setAttribute('data-bot-key', 'REPEAT_KEY')
    script.setAttribute('src', 'https://app.chatbotzone.com/widget.js')
    document.head.appendChild(script)
    Object.defineProperty(document, 'currentScript', { get: () => script, configurable: true })
    window.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof window.fetch // config never resolves

    // eslint-disable-next-line no-new-func
    const fn = new Function('window', 'document', 'fetch', widgetSrc)
    fn(window, document, window.fetch)

    const launcher = document.querySelector<HTMLElement>('[data-cbz-launcher]')
    // #c04b0c === rgb(192, 75, 12); jsdom normalizes to rgb()
    expect(launcher?.style.backgroundColor).toBe('rgb(192, 75, 12)')
  })
})

describe('mobile full-screen sheet', () => {
  it('sizes to the visual viewport and locks host scroll while open', () => {
    const { window, document } = setupDOM('MOBILE_KEY')
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true })
    // Keyboard open: visual viewport is shorter and pushed down.
    Object.defineProperty(window, 'visualViewport', {
      value: { offsetTop: 60, height: 500, addEventListener: () => {} },
      configurable: true,
    })
    const launcher = document.querySelector<HTMLElement>('[data-cbz-launcher]')!
    const wrapper = document.querySelector<HTMLElement>('[data-cbz-wrapper]')!

    launcher.click()
    expect(wrapper.style.top).toBe('60px')
    expect(wrapper.style.height).toBe('500px')
    expect(wrapper.style.bottom).toBe('auto')
    expect(document.documentElement.style.overflow).toBe('hidden')

    launcher.click()
    expect(document.documentElement.style.overflow).toBe('')
  })
})
