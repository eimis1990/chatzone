import 'server-only'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseBlogFrontmatter } from '@/lib/blog-frontmatter'
import { extractBlogFaq, renderBlogMarkdown } from '@/lib/blog-render'

export interface BlogPost {
  slug: string
  title: string
  description: string
  /** ISO date (yyyy-mm-dd). */
  date: string
  /** Optional ISO date of the last meaningful edit; feeds schema dateModified. */
  updated?: string
  author: string
  /** Author's role/title, shown next to their name. */
  authorRole: string
  /** Optional author headshot path (under /public). */
  authorImage?: string
  /** Optional hero image path (under /public), e.g. /blog/foo.webp. */
  image?: string
  /** Estimated reading time in minutes. */
  readingMinutes: number
  /** Rendered HTML body (frontmatter stripped). */
  html: string
  /** H2 section headings (with anchor ids) for the on-this-page table of contents. */
  headings: Heading[]
  /** Q&A pulled from the post's "Frequently asked questions" section, for FAQ schema. */
  faq: FaqItem[]
  /** Primary topic slug from the controlled vocabulary (lib/blog-topics.ts). */
  topic: string
  /** Explicit related-post slugs (frontmatter `related:`); else recent posts are used. */
  related?: string[]
  /** Author's LinkedIn profile URL, shown as a button in the byline. */
  authorLinkedin?: string
}

export interface Heading {
  id: string
  text: string
  level: number
}

export interface FaqItem {
  question: string
  answer: string
}

export const BLOG_PAGE_SIZE = 12

export interface BlogPage {
  posts: BlogPost[]
  page: number
  totalPages: number
  totalPosts: number
}

/** Rough reading time at ~200 words/min, floored at 1. */
function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

// The site owner writes the posts; show their headshot unless a post overrides it.
const OWNER = 'Eimantas Kudarauskas'
const OWNER_PHOTO = '/ceo.webp'
const OWNER_LINKEDIN = 'https://www.linkedin.com/in/ekudarauskas/'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

export interface BlogSource {
  slug: string
  data: Record<string, string>
  body: string
}

/** Raw, editable source for a known blog slug. Rejects path-like input. */
export function getBlogSourceBySlug(slug: string): BlogSource | null {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  let raw: string
  try {
    raw = readFileSync(join(BLOG_DIR, `${slug}.md`), 'utf8')
  } catch {
    return null
  }
  const { data, body } = parseBlogFrontmatter(raw)
  return { slug, data, body }
}

function fileToPost(filename: string): BlogPost {
  const raw = readFileSync(join(BLOG_DIR, filename), 'utf8')
  const { data, body } = parseBlogFrontmatter(raw)
  const author = data.author ?? 'Loqara'
  const { html, headings } = renderBlogMarkdown(body)
  return {
    slug: filename.replace(/\.mdx?$/, ''),
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    date: data.date ?? '1970-01-01',
    updated: data.updated || undefined,
    author,
    authorRole: data.authorRole ?? 'Founder',
    authorImage: data.authorImage || (author === OWNER ? OWNER_PHOTO : undefined),
    authorLinkedin: data.authorLinkedin || (author === OWNER ? OWNER_LINKEDIN : undefined),
    image: data.image || undefined,
    readingMinutes: readingTime(body),
    html,
    headings,
    related: data.related
      ? data.related.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    faq: extractBlogFaq(body),
    topic: data.topic ?? '',
  }
}

/** All posts, newest first. Returns [] if the content folder doesn't exist. */
export function getAllPosts(): BlogPost[] {
  let files: string[]
  try {
    files = readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/.test(f))
  } catch {
    return []
  }
  return files.map(fileToPost).sort((a, b) => b.date.localeCompare(a.date))
}

/** The archive always has a first page, even before the first post is published. */
export function getBlogPageCount(totalPosts: number): number {
  return Math.max(1, Math.ceil(Math.max(0, totalPosts) / BLOG_PAGE_SIZE))
}

/** Slice an already sorted post list without allowing empty soft-404 pages. */
export function getBlogPage(posts: BlogPost[], page: number): BlogPage | null {
  const totalPages = getBlogPageCount(posts.length)
  if (!Number.isSafeInteger(page) || page < 1 || page > totalPages) return null

  const start = (page - 1) * BLOG_PAGE_SIZE
  return {
    posts: posts.slice(start, start + BLOG_PAGE_SIZE),
    page,
    totalPages,
    totalPosts: posts.length,
  }
}

/** `/blog` owns page 1; numbered archive routes begin at page 2. */
export function parseBlogPageParam(value: string, totalPages: number): number | null {
  if (!/^[2-9]\d*$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) && page <= totalPages ? page : null
}

/** Static params for canonical numbered archive pages only. */
export function getBlogPaginationParams(totalPosts: number): Array<{ page: string }> {
  const totalPages = getBlogPageCount(totalPosts)
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }))
}

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null
}

/** Posts in a topic cluster, newest first (pillar ordering is the hub's concern). */
export function getPostsByTopic(topic: string): BlogPost[] {
  return getAllPosts().filter((p) => p.topic === topic)
}

/**
 * Posts to feature as "related guides" under a post: the explicit `related:`
 * slugs first (in order), then — as a defensive fallback for future drafts —
 * the newest posts from the SAME topic. Never global recency (design §3.5:
 * topical relationships are deliberate, not "whatever shipped last").
 */
export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  const all = getAllPosts()
  const current = all.find((p) => p.slug === slug)
  if (!current) return []
  const bySlug = new Map(all.map((p) => [p.slug, p]))
  const picks: BlogPost[] = []
  const add = (p?: BlogPost) => {
    if (p && p.slug !== slug && !picks.some((x) => x.slug === p.slug)) picks.push(p)
  }
  for (const rel of current.related ?? []) add(bySlug.get(rel))
  for (const p of all) {
    if (picks.length >= limit) break
    if (p.topic === current.topic) add(p)
  }
  return picks.slice(0, limit)
}
