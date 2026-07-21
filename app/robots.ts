import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Crawl management only — `noindex` metadata is the index-control mechanism
 * (design: docs/superpowers/specs/2026-07-20-seo-geo-remediation-design.md §3.6).
 *
 * - /api is disallowed as genuine crawl waste (endpoints, not pages).
 * - /app and /owner stay disallowed as crawl waste: anonymous fetches only
 *   produce auth redirects. Their layouts also emit noindex for defense in depth.
 * - /login, /reset-password, /accept-invite, /embed, and /present are NOT
 *   disallowed — they are publicly fetchable, so crawlers must be able to read
 *   the noindex directive those routes now serve.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api', '/app', '/owner'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
