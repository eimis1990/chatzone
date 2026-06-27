import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { getAllPosts } from '@/lib/blog'

/** Public, indexable pages. Add new marketing/content routes here as they ship. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const posts = getAllPosts()
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.7 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
