import { test, expect } from '@playwright/test'

/**
 * Happy-path E2E for the owner side. Requires:
 *   1. A running app (the Playwright webServer config starts one).
 *   2. A seeded owner account:
 *      node --env-file=.env.local scripts/seed-owner.mjs <email> <password>
 *   3. E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD in the environment.
 *
 * Run: E2E_OWNER_EMAIL=... E2E_OWNER_PASSWORD=... npx playwright test
 */
const email = process.env.E2E_OWNER_EMAIL
const password = process.env.E2E_OWNER_PASSWORD

test.skip(!email || !password, 'Set E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD to run')

test('owner logs in, sees dashboard, and creates a client invite', async ({ page }) => {
  // Login
  await page.goto('/login')
  await page.getByRole('textbox', { name: 'Email' }).fill(email!)
  await page.getByRole('textbox', { name: 'Password' }).fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Lands on the owner dashboard
  await page.waitForURL('**/owner')
  await expect(page.getByRole('heading', { name: 'Owner Dashboard' })).toBeVisible()

  // Create a client
  await page.goto('/owner/clients')
  await page.getByRole('button', { name: 'Add client' }).first().click()
  const stamp = `${Date.now()}`
  await page.getByRole('textbox', { name: 'Organisation name' }).fill(`E2E Org ${stamp}`)
  await page.getByRole('textbox', { name: 'Client email' }).fill(`e2e-${stamp}@example.test`)
  await page.getByRole('button', { name: 'Create invite' }).click()

  // An invite URL is produced
  const inviteField = page.getByRole('textbox', { name: 'Invite URL' })
  await expect(inviteField).toBeVisible()
  await expect(inviteField).toHaveValue(/\/accept-invite\/[a-f0-9]+/)
})

test('unauthenticated user is redirected from protected areas to login', async ({ page }) => {
  await page.goto('/owner')
  await page.waitForURL('**/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
})
