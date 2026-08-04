import { expect, test } from '@playwright/test'

test('critical landing content is visible before hydration', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Let your customers')
  await expect(page.getByText('Loqara gives your store a real voice agent')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible()
  await expect(page.getByText('AI voice + chat · always on')).toHaveCount(0)
  await expect(page.getByText('Easiest chat view customization on the market!')).toHaveCount(0)
  await expect(page.getByText("Free to start · add voice when you're ready")).toHaveCount(0)
  await expect(page.locator('img[src*="hero-lines-higgsfield"]')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'A widget that fits your brand' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'One agent. Every part of support.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Live in an afternoon' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Simple, honest pricing' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible()

  await context.close()
})

test('native landing anchors and signup hash remain functional', async ({ browser }) => {
  const context = await browser.newContext()

  const pricingPage = await context.newPage()
  await pricingPage.goto('/#pricing')
  await expect(pricingPage.getByRole('heading', { name: 'Simple, honest pricing' })).toBeInViewport()

  const howPage = await context.newPage()
  await howPage.goto('/#how')
  await expect(howPage.getByRole('heading', { name: 'Live in an afternoon' })).toBeInViewport()

  const faqPage = await context.newPage()
  await faqPage.goto('/#faq')
  await expect(
    faqPage.getByRole('heading', { name: 'Frequently asked questions' }),
  ).toBeInViewport()

  const signupPage = await context.newPage()
  await signupPage.goto('/#get-started')
  await expect(signupPage.getByRole('dialog')).toBeVisible()
  await expect(
    signupPage.getByRole('heading', { name: "Let's get your assistant started" }),
  ).toBeVisible()

  await context.close()
})

test('reduced motion keeps every static hero message visible', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors: string[] = []
  const heroVideoRequests: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('request', (request) => {
    if (request.url().includes('loqara-hero-') && request.url().endsWith('.mp4')) {
      heroVideoRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(
    page.getByRole('img', { name: "Loqara's fox support agent standing ready to help" }),
  ).toBeVisible()
  await expect(page.locator('.hero-message')).toHaveCount(3)
  await expect(page.locator('.hero-message-one')).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-message-two')).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-message-three')).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-message-one')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.landing-brand-marquee')).toHaveCSS('animation-name', 'none')
  expect(heroVideoRequests).toEqual([])
  expect(pageErrors).toEqual([])

  await context.close()
})

test('save-data keeps the landing hero video-free', async ({ browser }) => {
  const context = await browser.newContext()
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: {
        effectiveType: '4g',
        saveData: true,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
    })
  })
  const page = await context.newPage()
  const heroVideoRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('loqara-hero-') && request.url().endsWith('.mp4')) {
      heroVideoRequests.push(request.url())
    }
  })

  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(
    page.getByRole('img', { name: "Loqara's fox support agent standing ready to help" }),
  ).toBeVisible()
  expect(heroVideoRequests).toEqual([])

  await context.close()
})

test('landing widget defers network and opens on the first proxy click', async ({ page }) => {
  const widgetRequests: string[] = []
  page.on('request', (request) => {
    const url = request.url()
    if (
      url.endsWith('/widget.js') ||
      url.includes('/api/widget-config') ||
      url.includes('/embed/')
    ) {
      widgetRequests.push(url)
    }
  })

  await page.goto('/')
  const proxyLauncher = page.getByTestId('deferred-widget-launcher')
  await expect(proxyLauncher).toBeVisible()
  await page.waitForTimeout(1500)
  expect(widgetRequests).toEqual([])

  await proxyLauncher.click()
  await expect(page.locator('[data-cbz-launcher]')).toHaveCount(1)
  await expect(page.locator('[data-cbz-iframe]')).toHaveCount(1)
  expect(widgetRequests.some((url) => url.endsWith('/widget.js'))).toBe(true)
  expect(widgetRequests.some((url) => url.includes('/api/widget-config'))).toBe(true)
  expect(widgetRequests.some((url) => url.includes('/embed/'))).toBe(true)
})

test('mobile hero stays video-free and reveals the full conversation', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const requestedVideos: string[] = []
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  page.on('request', (request) => {
    if (request.url().includes('loqara-hero-') && request.url().endsWith('.mp4')) {
      requestedVideos.push(new URL(request.url()).pathname)
    }
  })

  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(
    page.getByRole('img', { name: "Loqara's fox support agent standing ready to help" }),
  ).toBeVisible()
  await expect(page.locator('.hero-message-one')).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-message-two')).toHaveCSS('opacity', '1')
  await expect(page.locator('.hero-message-three')).toHaveCSS('opacity', '1')
  const heroBox = await page.locator('.landing-hero').boundingBox()
  const foxBox = await page.locator('.landing-hero-fox').boundingBox()
  const marqueeBox = await page.getByTestId('hero-platform-marquee').boundingBox()
  expect((heroBox?.y ?? 0) + (heroBox?.height ?? 0)).toBeCloseTo(844, 0)
  expect((marqueeBox?.y ?? 0) + (marqueeBox?.height ?? 0)).toBeCloseTo(844, 0)
  expect(Math.abs((foxBox?.x ?? 0) + (foxBox?.width ?? 0) / 2 - 195)).toBeLessThanOrEqual(12)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    ),
  ).toBe(true)
  expect(requestedVideos).toEqual([])

  await page.goto('/blog')
  await expect(page.locator('video')).toHaveCount(0)
  expect(pageErrors).toEqual([])

  await context.close()
})

test('showcase bounds image requests and keeps carousel navigation', async ({ page }) => {
  const chatViewRequests = new Set<string>()
  page.on('request', (request) => {
    if (request.url().includes('chatviews')) {
      chatViewRequests.add(request.url())
    }
  })

  await page.goto('/')
  const carousel = page.getByTestId('widget-design-carousel')
  await carousel.scrollIntoViewIfNeeded()
  await expect(carousel.locator('img')).toHaveCount(3)
  expect(chatViewRequests.size).toBeLessThanOrEqual(3)

  const firstCard = carousel.getByRole('button', { name: /Purple Loud\.Chapted/ })
  const secondCard = carousel.getByRole('button', { name: /Green FAMLAI/ })
  const lastCard = carousel.getByRole('button', { name: /Cream Domo\.AI/ })

  await expect(firstCard).toHaveAttribute('aria-current', 'true')
  await secondCard.click()
  await expect(secondCard).toHaveAttribute('aria-current', 'true')

  await carousel.getByRole('button', { name: 'Go to design 1', exact: true }).click()
  await carousel.getByRole('button', { name: 'Previous' }).click()
  await expect(lastCard).toHaveAttribute('aria-current', 'true')

  const stage = page.getByTestId('widget-design-stage')
  const box = await stage.boundingBox()
  expect(box).not.toBeNull()
  if (box) {
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height / 2, { steps: 6 })
    await page.mouse.up()
  }
  await expect(firstCard).toHaveAttribute('aria-current', 'true')
})
