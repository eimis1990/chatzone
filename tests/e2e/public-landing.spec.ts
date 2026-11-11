import { expect, test, type Page } from '@playwright/test'

/** The transparent fox loops (not the still, which is an image). */
const isFoxLoop = (url: string) => /hero-fox-idle(-hevc)?\.(webm|mp4)$/.test(url)

const scrollToEnd = (page: Page) =>
  page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))

const HEADINGS = [
  'Greta can’t sleep. She wants to know where her order is.',
  'Marta is feeding the baby. She asks out loud instead.',
  'Jonas asks something your store never wrote down.',
  'Good morning. Here is your night.',
  'Jonas was the third to ask that this week.',
  'It looks like your store, not like ours',
  'See it on your store first. Then pick how to go live.',
  'Free for 100 conversations a month',
  'Prefer it done for you?',
  'Frequently asked questions',
  'It will be 2:47 AM again tonight.',
]

test('critical landing content is visible before hydration', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your store just answered')
  await expect(page.getByText('While you sleep, shoppers still ask.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'See it on my store' }).first()).toBeVisible()
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
    ['#showcase', 'It looks like your store, not like ours'],
    ['#how', 'See it on your store first. Then pick how to go live.'],
    ['#pricing', 'Free for 100 conversations a month'],
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
    signupPage.getByRole('heading', { name: 'See it on your own store' }),
  ).toBeVisible()

  await context.close()
})

test('reduced motion shows the hero conversation at once, with nothing animating', async ({
  browser,
}) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors: string[] = []
  const foxLoops: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('request', (request) => {
    if (isFoxLoop(request.url())) foxLoops.push(request.url())
  })

  await page.goto('/')
  const answer = page.getByTestId('hero-window').getByText('Yes, the Luna with oak legs is in stock')
  await expect(answer).toHaveCSS('opacity', '1')
  await expect(answer).toHaveCSS('animation-name', 'none')

  // The fox stays a still image: its loop is never fetched.
  await scrollToEnd(page)
  const fox = page.getByTestId('night-fox')
  await expect(fox.getByRole('img')).toBeVisible()
  await page.waitForTimeout(1000)
  expect(foxLoops).toEqual([])
  await expect(fox).not.toHaveAttribute('data-live', '')
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

test('the hero offers the live assistant, and that opens the real widget', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Or chat with it right now' }).click()
  await expect(page.locator('[data-cbz-iframe]')).toHaveCount(1)
  await expect(page.locator('[data-cbz-launcher]')).toHaveAttribute('aria-expanded', 'true')
})

// Below 1024px the page is one column of copy and the widget's greeting bubble
// would sit on it. (widget-loader.test.ts proves the widget honours the opt-out.)
test('the live widget keeps its greeting off the page on narrow screens', async ({ browser }) => {
  for (const [width, greeting] of [
    [390, 'off'],
    [1440, null],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height: 844 } })
    const page = await context.newPage()
    await page.goto('/')
    // Opening the chat injects the loader straight away (it is otherwise idle-loaded).
    await page.getByTestId('deferred-widget-launcher').click()
    const loader = page.locator('script[data-cbz-embed]')
    await expect(loader).toHaveCount(1)
    expect(await loader.getAttribute('data-greeting')).toBe(greeting)
    await context.close()
  }
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
  await scrollToEnd(page)
  expect(await fits()).toBe(true)
  expect(pageErrors).toEqual([])

  await context.close()
})

test('the fox loop loads only when reached, and shows once it proves transparent', async ({
  page,
}) => {
  const foxLoops: string[] = []
  page.on('request', (request) => {
    if (isFoxLoop(request.url())) foxLoops.push(request.url())
  })

  await page.goto('/')
  await page.waitForTimeout(1000)
  expect(foxLoops).toEqual([])

  await scrollToEnd(page)
  const fox = page.getByTestId('night-fox')
  await expect(fox).toHaveAttribute('data-live', '')
  await expect(fox.locator('video')).toHaveCSS('opacity', '1')
  expect(foxLoops).toHaveLength(1)
  await expect(page.getByText('Go to bed. I’ve got the store.')).toBeVisible()
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
  await expect(clock).toHaveText('2:47 AM')

  await scrollScene(0)
  await expect(clock).toHaveText('3:12 AM')
  await expect(order).toHaveCSS('opacity', '0')

  // The clock agrees with the scene's own time for as long as the scene plays.
  await scrollScene(0.95)
  await expect(order).toHaveCSS('opacity', '1')
  await expect(clock).toHaveText('3:12 AM')

  // English on an English page; the assistant's other language is one click away.
  await expect(order).toContainText('Order #10482')
  await page.locator('#features').getByRole('button', { name: 'Lithuanian' }).click()
  await expect(order).toContainText('Užsakymas #10482')
})

test('morning inbox and widget playground respond', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('AI success 2/5:')).toBeVisible()
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
  await page.locator('#showcase').getByRole('button', { name: 'Lithuanian' }).click()
  await expect(preview.getByText('Virtuali asistentė')).toBeVisible()
  const clip = page.waitForRequest((request) => request.url().endsWith('/landing/greeting-lt.mp3'))
  await preview.getByRole('button', { name: 'Išgirsti balso pasisveikinimą' }).click()
  await clip
})

test('demand radar turns the unanswered question into an approved fix', async ({ page }) => {
  await page.goto('/')
  const radar = page.locator('[data-clock="510"]')

  await expect(radar.getByText('Can the Oslo sofa be made in a custom width?')).toBeVisible()
  await radar.getByRole('button', { name: 'Approve and add' }).click()
  await expect(radar.getByText('Your assistant answers this from now on.')).toBeVisible()
  await expect(radar.getByText('Handled')).toBeVisible()

  // Things the assistant cannot change are saved as tasks, not "applied".
  await radar.getByRole('button', { name: /Paying in installments/ }).click()
  await radar.getByRole('button', { name: 'Save for review' }).click()
  await expect(radar.getByText('Saved to your review list.')).toBeVisible()
})

test('the request form promises a preview, not instant access', async ({ page }) => {
  await page.goto('/')

  // No button on the page may promise an account: visitors cannot make one.
  for (const label of ['Get started', 'Start free', 'Sign up']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0)
  }

  await page.getByRole('button', { name: 'See it on my store' }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('Within one working day we email you a preview')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Send me the preview' })).toBeVisible()
})

test('how it works leads with done-for-you and prices the chosen package', async ({ page }) => {
  await page.goto('/')
  const how = page.locator('#how')

  await expect(how.getByRole('heading', { name: 'We set it up for you' })).toBeVisible()
  await expect(how.getByText('€749')).toBeVisible()
  await how.getByRole('button', { name: 'Questions, products and orders' }).click()
  await expect(how.getByText('€995')).toBeVisible()
  await expect(how.getByText('Live in about 2 weeks.')).toBeVisible()

  await how.getByRole('button', { name: 'Request setup' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Your website')).toHaveAttribute('required', '')
})
