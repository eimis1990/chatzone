import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/** Public, indexable pages. Add new marketing/content routes here as they ship. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
