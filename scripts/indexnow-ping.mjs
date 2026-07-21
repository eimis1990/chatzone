// IndexNow ping — notifies Bing/Yandex/etc. that our public URLs changed, so
// they recrawl in hours instead of waiting for the next scheduled crawl.
// (Google does NOT use IndexNow; it relies on the sitemap + GSC.)
//
// DELTA-ONLY (plan task 6.3): the build ships public/indexnow-manifest.json
// (url → content hash, generated pre-build). This script rebuilds the manifest
// from the working tree, fetches the LIVE site's manifest (still the previous
// deployment while the build runs), and submits only changed/added/removed
// URLs. An unchanged build submits nothing. If no live baseline exists (first
// deploy, fetch error), it submits nothing rather than spamming the full list.
//
// Runs automatically after `next build` on PRODUCTION deploys (see the `build`
// script). It is intentionally fail-safe: it NEVER throws and always exits 0.
//
// Manual full resubmission of every URL: `npm run indexnow` (--force).
//
// IndexNow key is public by design — it's hosted at /<key>.txt to prove we own
// the domain. Keep this value in sync with the file in public/.

import { buildManifest, diffManifests } from './indexnow-manifest.mjs'

const KEY = 'a58f1e5d94c32c16e9297f00c46c15ef'
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.loqara.com').replace(/\/+$/, '')
const FORCE = process.argv.includes('--force')
const ENDPOINT = 'https://api.indexnow.org/indexnow'

async function fetchLiveManifest() {
  try {
    const res = await fetch(`${SITE_URL}/indexnow-manifest.json`, {
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json && typeof json === 'object' ? json : null
  } catch {
    return null
  }
}

async function main() {
  // Only ping for real on production deploys, or when explicitly forced.
  if (!FORCE && process.env.VERCEL_ENV !== 'production') {
    console.log(`[indexnow] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}; use --force to override)`)
    return
  }

  let current = {}
  try {
    current = buildManifest()
  } catch (err) {
    console.warn('[indexnow] could not build manifest:', err?.message)
    return
  }

  let urlList = []
  if (FORCE) {
    urlList = Object.keys(current)
    console.log(`[indexnow] --force: submitting all ${urlList.length} URLs`)
  } else {
    const previous = await fetchLiveManifest()
    if (!previous) {
      console.log('[indexnow] no live baseline manifest — submitting nothing (use --force for a full push)')
      return
    }
    const { changed, deleted } = diffManifests(previous, current)
    urlList = [...changed, ...deleted]
    if (urlList.length === 0) {
      console.log('[indexnow] no content changes — nothing to submit')
      return
    }
    console.log(`[indexnow] delta: ${changed.length} changed/added, ${deleted.length} removed`)
  }

  const host = new URL(SITE_URL).host
  const body = { host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })
    // 200 = accepted, 202 = accepted (pending). Both are success.
    console.log(`[indexnow] submitted ${urlList.length} URLs → HTTP ${res.status}`)
    for (const u of urlList) console.log(`[indexnow]   ${u}`)
  } catch (err) {
    console.warn('[indexnow] submission failed (non-fatal):', err?.message)
  }
}

main().finally(() => process.exit(0))
