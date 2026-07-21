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

/**
 * Last substantive edit of each legal page (from git history — content edits,
 * not styling). Shown on the page and used as sitemap `lastModified`. Bump
 * manually when the copy meaningfully changes; never derive from build time.
 */
export const LEGAL_UPDATED = {
  privacy: '2026-07-02',
  terms: '2026-07-02',
} as const

/**
 * The publishing author (single-author blog). Facts only — role and links are
 * verifiable; extend via owner input, never invention (design §3.8).
 */
export const AUTHOR = {
  name: 'Eimantas Kudarauskas',
  slug: 'eimantas-kudarauskas',
  jobTitle: 'Founder',
  linkedin: 'https://www.linkedin.com/in/ekudarauskas/',
  photo: '/ceo.webp',
} as const

/** Creation/last-substantive-edit dates of the static identity pages. */
export const IDENTITY_PAGES_UPDATED = '2026-07-21'

/** Render a YYYY-MM-DD date as e.g. "July 2, 2026" for visible "last updated" labels. */
export function formatUpdated(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
