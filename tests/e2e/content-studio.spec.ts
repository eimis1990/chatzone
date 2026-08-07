import { expect, test } from '@playwright/test'

const email = process.env.E2E_OWNER_EMAIL
const password = process.env.E2E_OWNER_PASSWORD
const readyItemId = process.env.E2E_CONTENT_READY_ITEM_ID
const publishingConfigured = Boolean(
  process.env.GITHUB_CONTENT_TOKEN
  && process.env.GITHUB_CONTENT_REPOSITORY
  && process.env.GITHUB_CONTENT_BASE_BRANCH,
)

test.skip(!email || !password, 'Set E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD to run')

test('owner can open Content Studio and configure all review-gated destinations', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(email!)
  await page.getByRole('textbox', { name: 'Password' }).fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/owner')

  await page.goto('/owner/content')
  await expect(page.getByRole('heading', { name: 'Content Studio' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'New article' }).first()).toBeVisible()

  await page.getByRole('link', { name: 'Settings' }).click()
  await page.waitForURL('**/owner/content/settings')
  await expect(page.getByRole('heading', { name: 'Automation & publishing' })).toBeVisible()
  await expect(page.getByText('Review by default')).toBeVisible()
  await expect(page.locator('[data-provider-logo]')).toHaveCount(6)

  for (const provider of ['website', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok']) {
    await expect(page.locator(`[data-provider-logo="${provider}"]`)).toBeVisible()
  }
  await expect(page.getByText('Connector required')).toHaveCount(6)
  await expect(page.getByText('Nothing can leave Loqara until that destination shows Connected')).toBeVisible()
})

test('ready article fails closed when GitHub publishing is not configured', async ({ page }) => {
  test.skip(!readyItemId, 'Set E2E_CONTENT_READY_ITEM_ID to a ready owner content item')
  test.skip(publishingConfigured, 'This assertion covers the missing GitHub credential state')

  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(email!)
  await page.getByRole('textbox', { name: 'Password' }).fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/owner')

  await page.goto(`/owner/content/${readyItemId}`)
  await expect(page.getByRole('alert').filter({ hasText: 'GitHub publishing is not configured' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create draft PR' })).toBeDisabled()
})
