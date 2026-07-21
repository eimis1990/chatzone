import { expect, test } from '@playwright/test'

test('critical landing content is visible before hydration', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()

  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Let your customers')
  await expect(page.getByText('Loqara gives your store a real voice agent')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get started' }).first()).toBeVisible()
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

test('reduced motion keeps a hydration-safe static hero', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('img[src="/loqara-hero-poster.webp"]')).toBeVisible()
  await expect(page.locator('.landing-brand-marquee')).toHaveCSS('animation-name', 'none')
  expect(pageErrors).toEqual([])

  await context.close()
})
