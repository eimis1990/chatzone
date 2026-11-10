import { expect, test } from '@playwright/test'

const HEADINGS = [
  'Ieva can’t sleep. She wants to know where her order is.',
  'Marta is feeding the baby. She asks out loud instead.',
  'Jonas asks something the store never wrote down.',
  'Good morning. Here is your night.',
  'A widget that fits your brand',
  'Live in an afternoon, or leave it to us',
  'Simple, honest pricing',
  'Prefer it done for you?',
  'Frequently asked questions',
  'It will be 2:47 AM again tonight.',
]

test('critical landing content is visible before hydration', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your store just answered')
  await expect(
    page.getByText('Loqara is the AI chat and voice agent for online stores'),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible()
  for (const name of HEADINGS) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }
  // The hero conversation is server HTML revealed by CSS delays alone.
  await expect(
    page.getByTestId('hero-window').getByText('Yes, the Luna with oak legs is in stock'),
  ).toHaveCSS('opacity', '1')

  await context.close()
})

test('native landing anchors and signup hash remain functional', async ({ browser }) => {
  const context = await browser.newContext()

  for (const [hash, heading] of [
    ['#features', HEADINGS[0]],
    ['#showcase', 'A widget that fits your brand'],
    ['#how', 'Live in an afternoon, or leave it to us'],
    ['#pricing', 'Simple, honest pricing'],
    ['#faq', 'Frequently asked questions'],
  ]) {
    const page = await context.newPage()
    await page.goto(`/${hash}`)
    await expect(page.getByRole('heading', { name: heading })).toBeInViewport()
    await page.close()
  }

  const signupPage = await context.newPage()
  await signupPage.goto('/#get-started')
  await expect(signupPage.getByRole('dialog')).toBeVisible()
  await expect(
    signupPage.getByRole('heading', { name: "Let's get your assistant started" }),
  ).toBeVisible()

  await context.close()
})

test('reduced motion shows the hero conversation at once, with nothing animating', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  const answer = page.getByTestId('hero-window').getByText('Yes, the Luna with oak legs is in stock')
  await expect(answer).toHaveCSS('opacity', '1')
  await expect(answer).toHaveCSS('animation-name', 'none')
  await expect(page.locator('video')).toHaveCount(0)
  expect(pageErrors).toEqual([])

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

test('mobile landing never scrolls sideways', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const fits = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    )

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('hero-window')).toBeVisible()
  expect(await fits()).toBe(true)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  expect(await fits()).toBe(true)
  expect(pageErrors).toEqual([])

  await context.close()
})

test('hero questions swap the conversation', async ({ page }) => {
  await page.goto('/')
  const hero = page.getByTestId('hero-window')
  const returns = hero.getByRole('button', { name: 'Can I return it?' })

  await expect(hero.getByRole('button', { name: 'Luna in oak?' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await returns.click()
  await expect(returns).toHaveAttribute('aria-pressed', 'true')
  await expect(hero.getByText('You have 14 days from delivery')).toHaveCSS('opacity', '1')
  await expect(hero.getByText('Answered from the store’s Returns page')).toBeVisible()

  // The composer asks the next one.
  await hero.getByRole('button', { name: 'Ask the next example question' }).click()
  await expect(hero.getByRole('button', { name: 'Delivery to Riga?' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('scrolling a pinned scene plays it and runs the clock', async ({ page }) => {
  const scrollScene = (progress: number) =>
    page.evaluate((p) => {
      const scene = document.querySelector<HTMLElement>('#features')!
      const top = scene.getBoundingClientRect().top + window.scrollY
      const pin = scene.offsetHeight - window.innerHeight
      window.scrollTo({ top: top + pin * p, behavior: 'instant' })
    }, progress)

  await page.goto('/')
  const clock = page.getByTestId('page-clock')
  const order = page.getByTestId('order-card')
  await expect(clock).toHaveText('02:47')

  await scrollScene(0)
  await expect(clock).toHaveText('03:12')
  await expect(order).toHaveCSS('opacity', '0')

  await scrollScene(0.95)
  await expect(order).toHaveCSS('opacity', '1')
  await expect(clock).toHaveText(/^0[34]:\d\d$/)

  // The same conversation, in the visitor's other language.
  await page.locator('#features').getByRole('button', { name: 'English' }).click()
  await expect(order).toContainText('Order #10482')
})

test('morning inbox and widget playground respond', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Take over', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Return to bot' })).toBeVisible()
  await expect(page.getByText('You are replying')).toBeVisible()

  const preview = page.getByTestId('playground-preview')
  await page.getByRole('radio', { name: 'Forest' }).click()
  expect(
    await preview.evaluate((el) => getComputedStyle(el).getPropertyValue('--w-accent').trim()),
  ).toBe('#2f7d5b')
  await page.getByRole('button', { name: 'Pill', exact: true }).click()
  await expect(preview.getByText('Chat with us')).toBeVisible()

  // The widget speaks its greeting in the language it is set to.
  await page.locator('#showcase').getByRole('button', { name: 'Lietuvių' }).click()
  await expect(preview.getByText('Virtualus asistentas')).toBeVisible()
  const clip = page.waitForRequest((request) => request.url().endsWith('/landing/greeting-lt.mp3'))
  await preview.getByRole('button', { name: 'Išgirsti balso pasisveikinimą' }).click()
  await clip
})

test('how it works leads with done-for-you and prices the chosen package', async ({ page }) => {
  await page.goto('/')
  const how = page.locator('#how')

  await expect(how.getByRole('heading', { name: 'We set it up for you' })).toBeVisible()
  await expect(how.getByText('€749')).toBeVisible()
  await how.getByRole('button', { name: 'Questions, products and orders' }).click()
  await expect(how.getByText('€995')).toBeVisible()
  await expect(how.getByText('Live in ~2 weeks.')).toBeVisible()

  await how.getByRole('button', { name: 'Request setup' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Your website')).toHaveAttribute('required', '')
})
