import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * Allow crawlers on the public marketing pages; keep the dashboard, owner
 * console, API, embedded widgets, and auth flows out of the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/app', '/owner', '/api', '/embed', '/login', '/reset-password', '/accept-invite'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
