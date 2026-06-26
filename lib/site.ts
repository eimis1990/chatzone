/**
 * Public origin of the site — the single source of truth for canonical URLs,
 * Open Graph/Twitter metadata, the sitemap, robots, and JSON-LD.
 *
 * Reads NEXT_PUBLIC_APP_URL (set per environment; the validated env contract in
 * lib/env.ts requires it in production). Falls back to the brand domain so a
 * misconfigured preview never emits `localhost` canonicals by surprise.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.loqara.com').replace(/\/+$/, '')

/** Human-facing brand name, reused across metadata + structured data. */
export const SITE_NAME = 'Loqara'
