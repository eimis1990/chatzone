import { expect, test } from '@playwright/test'

test('blog pagination is crawlable without JavaScript and has canonical archive pages', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const articleUrls = new Set<string>()
  let archivePage = 1

  while (true) {
    const path = archivePage === 1 ? '/blog' : `/blog/page/${archivePage}`
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'AI support guides for e-commerce' })).toBeVisible()
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(new URL(canonical!).pathname).toBe(
      archivePage === 1 ? '/blog' : `/blog/page/${archivePage}`,
    )

    const cardLinks = page.getByTestId('blog-post-grid').locator('article h3 a')
    const count = await cardLinks.count()
    expect(count).toBeGreaterThan(0)
    expect(count).toBeLessThanOrEqual(12)
    if (archivePage === 1) expect(count).toBe(12)

    for (const href of await cardLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href')))) {
      expect(href).toMatch(/^\/blog\/[a-z0-9-]+$/)
      articleUrls.add(href!)
    }

    const next = page.getByRole('link', { name: 'Next' })
    if ((await next.count()) === 0) break
    archivePage += 1
  }

  expect(archivePage).toBeGreaterThan(1)
  expect(articleUrls.size).toBe(51)
  await context.close()
})

test('duplicate and malformed archive URLs return hard 404s', async ({ request }) => {
  for (const path of ['/blog/page/1', '/blog/page/0', '/blog/page/-1', '/blog/page/2.5', '/blog/page/02', '/blog/page/nope', '/blog/page/999']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(404)
  }
})

test('blog index bounds optimized image requests and reserves cover layout', async ({ page }) => {
  const imageRequests = new Set<string>()
  page.on('request', (request) => {
    if (request.resourceType() === 'image') imageRequests.add(request.url())
  })

  await page.goto('/blog')
  await expect(page.getByTestId('blog-post-grid').locator('article')).toHaveCount(12)
  await page.waitForLoadState('networkidle')

  expect(imageRequests.size).toBeLessThanOrEqual(16)
  await expect(page.locator('link[rel="preload"][as="image"]')).toHaveCount(1)
  await expect(page.getByTestId('blog-post-grid').locator('img').first()).toHaveAttribute('loading', 'eager')

  const coverBoxes = await page
    .getByTestId('blog-post-grid')
    .locator('article > a')
    .evaluateAll((links) => links.map((link) => ({ width: link.clientWidth, height: link.clientHeight })))
  expect(coverBoxes.every(({ width, height }) => width > 0 && Math.abs(width / height - 4 / 3) < 0.02)).toBe(true)
})

test('article hero and related covers use responsive optimized images', async ({ page }) => {
  await page.goto('/blog')
  const firstPost = await page.getByTestId('blog-post-grid').locator('article h3 a').first().getAttribute('href')
  expect(firstPost).toBeTruthy()

  await page.goto(firstPost!)
  const articleHero = page.locator('article > div.relative img').first()
  await expect(articleHero).toHaveAttribute('sizes', '(min-width: 1024px) 624px, calc(100vw - 40px)')
  await expect(articleHero).toHaveAttribute('src', /\/_next\/image\?url=/)

  const relatedImages = page.getByRole('heading', { name: 'Related guides' }).locator('..').locator('img')
  expect(await relatedImages.count()).toBeGreaterThan(0)
  for (const image of await relatedImages.all()) {
    await expect(image).toHaveAttribute('loading', 'lazy')
    await expect(image).toHaveAttribute('src', /\/_next\/image\?url=/)
  }
})
