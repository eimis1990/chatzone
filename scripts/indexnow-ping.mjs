// IndexNow ping — notifies Bing/Yandex/etc. that our public URLs changed, so
// they recrawl in hours instead of waiting for the next scheduled crawl.
// (Google does NOT use IndexNow; it relies on the sitemap + GSC.)
//
// Runs automatically after `next build` on PRODUCTION deploys (see the `build`
// script). It is intentionally fail-safe: it NEVER throws and always exits 0, so
// a network hiccup or IndexNow outage can never break a deploy.
//
// Manual run (pings the live site any time): `npm run indexnow`
//
// IndexNow key is public by design — it's hosted at /<key>.txt to prove we own
// the domain. Keep this value in sync with the file in public/.

import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const KEY = 'e45327d6d3e3404362460bdf9087fb8d'
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.loqara.com').replace(/\/+$/, '')
const FORCE = process.argv.includes('--force')
const ENDPOINT = 'https://api.indexnow.org/indexnow'

async function main() {
  // Only ping for real on production deploys, or when explicitly forced.
  if (!FORCE && process.env.VERCEL_ENV !== 'production') {
    console.log(`[indexnow] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}; use --force to override)`)
    return
  }

  let slugs = []
  try {
    slugs = readdirSync(join(process.cwd(), 'content', 'blog'))
      .filter((f) => /\.mdx?$/.test(f))
      .map((f) => f.replace(/\.mdx?$/, ''))
  } catch (err) {
    console.warn('[indexnow] could not read content/blog:', err?.message)
  }

  // Mirror the indexable set in app/sitemap.ts.
  const urlList = [
    `${SITE_URL}/`,
    `${SITE_URL}/blog`,
    ...slugs.map((s) => `${SITE_URL}/blog/${s}`),
    `${SITE_URL}/privacy`,
    `${SITE_URL}/terms`,
  ]

  const host = new URL(SITE_URL).host
  const body = { host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    // 200 = accepted, 202 = accepted (pending). Both are success.
    console.log(`[indexnow] submitted ${urlList.length} URLs → HTTP ${res.status}`)
  } catch (err) {
    console.warn('[indexnow] submission failed (non-fatal):', err?.message)
  } finally {
    clearTimeout(timeout)
  }
}

main().finally(() => process.exit(0))
