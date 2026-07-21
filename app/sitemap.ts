import type { MetadataRoute } from 'next'
import { SITE_URL, LEGAL_UPDATED, AUTHOR, IDENTITY_PAGES_UPDATED } from '@/lib/site'
import { getAllPosts } from '@/lib/blog'
import { TOPIC_SLUGS } from '@/lib/blog-topics'

/**
 * Public, indexable pages. Add new marketing/content routes here as they ship.
 *
 * Freshness policy (design §3.7): `lastModified` is a real meaningful-edit
 * date or absent. Articles use `updated ?? date`; legal pages use the fixed
 * LEGAL_UPDATED constants; homepage and blog listings omit the field because
 * no reliable per-edit source exists. Never stamp `new Date()` at request time.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts()
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.7 },
    // Archive pages (/blog/page/n) stay out deliberately: crawlable via anchor
    // pagination, self-canonical, but not content destinations (phase-3 decision;
    // see tests/unit/blog-pagination.test.ts). Topic hubs ARE destinations —
    // each has a unique editorial intro and curated cluster.
    ...TOPIC_SLUGS.map((t) => ({
      url: `${SITE_URL}/blog/topics/${t}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.updated ?? p.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/about`, lastModified: new Date(IDENTITY_PAGES_UPDATED), changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/authors/${AUTHOR.slug}`, lastModified: new Date(IDENTITY_PAGES_UPDATED), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/editorial-policy`, lastModified: new Date(IDENTITY_PAGES_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/review-methodology`, lastModified: new Date(IDENTITY_PAGES_UPDATED), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(LEGAL_UPDATED.privacy), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(LEGAL_UPDATED.terms), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
