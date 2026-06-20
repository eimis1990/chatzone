import { defineConfig, devices } from '@playwright/test'

// E2E config. Assumes a dev server is already running (or starts one) and that
// an owner account has been seeded (scripts/seed-owner.mjs) with the
// credentials in E2E_OWNER_EMAIL / E2E_OWNER_PASSWORD.
const PORT = process.env.E2E_PORT ?? '3100'
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
