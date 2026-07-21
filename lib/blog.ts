import 'server-only'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { marked } from 'marked'

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

/** URL-safe slug for a heading anchor (unicode letters/numbers kept). */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Rough reading time at ~200 words/min, floored at 1. */
function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

function tableLabel(inner: string, index: number): string {
  const text = inner.replace(/<[^>]+>/g, '').trim() || (index === 0 ? 'Item' : `Column ${index + 1}`)
  return text.replace(/"/g, '&quot;')
}

/** Add responsive metadata while preserving the table's semantic HTML. */
function enhanceTables(html: string): string {
  return html.replace(/<table>([\s\S]*?)<\/table>/g, (_table, inner: string) => {
    const headerRow = inner.match(/<thead>[\s\S]*?<tr>([\s\S]*?)<\/tr>[\s\S]*?<\/thead>/)
    const headers = headerRow
      ? [...headerRow[1].matchAll(/<th>([\s\S]*?)<\/th>/g)].map((match, index) => tableLabel(match[1], index))
      : []
    const columnCount = headers.length
    const layout = columnCount >= 4 ? 'wide' : 'compact'

    const labelled = headers.length
      ? inner.replace(/<tbody>([\s\S]*?)<\/tbody>/, (_body, rows: string) => {
          const labelledRows = rows.replace(/<tr>([\s\S]*?)<\/tr>/g, (_row, cells: string) => {
            let column = 0
            return `<tr>${cells.replace(/<td>/g, () => {
              const label = headers[column] ?? `Column ${column + 1}`
              column += 1
              return `<td data-label="${label}">`
            })}</tr>`
          })
          return `<tbody>${labelledRows}</tbody>`
        })
      : inner

    return `<div class="table-wrap table-wrap--${layout}" data-columns="${columnCount}"><table>${labelled}</table></div>`
  })
}

/**
 * Render Markdown to HTML: inject anchor ids on H2/H3 (collecting H2s for the
 * table of contents) and annotate tables for responsive presentation.
 */
function renderBody(body: string): { html: string; headings: Heading[] } {
  let html = marked.parse(body, { async: false }) as string
  const headings: Heading[] = []
  const seen = new Map<string, number>()
  // marked emits bare <h2>/<h3> (no attributes) — add ids for anchor links.
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_m, depth: string, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, '').trim()
    let id = slugify(label) || 'section'
    const n = seen.get(id) ?? 0
    seen.set(id, n + 1)
    if (n) id = `${id}-${n}`
    if (depth === '2') headings.push({ id, text: label, level: 2 })
    return `<h${depth} id="${id}">${inner}</h${depth}>`
  })
  html = enhanceTables(html)
  return { html, headings }
}

/** Strip light inline Markdown so an FAQ answer reads as clean text in schema. */
function stripInlineMd(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → label
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Pull Q&A pairs from a post's "Frequently asked questions" H2 section: each H3
 * is a question, the prose beneath it the answer. Single source of truth — the
 * page renders this section for humans and reuses these pairs for FAQ schema.
 */
function extractFaq(body: string): FaqItem[] {
  const tokens = marked.lexer(body)
  const faqs: FaqItem[] = []
  let inFaq = false
  let current: { q: string; a: string[] } | null = null
  const flush = () => {
    if (current && current.q && current.a.length) {
      faqs.push({ question: current.q, answer: current.a.join(' ').trim() })
    }
    current = null
  }
  for (const t of tokens) {
    if (t.type === 'heading') {
      const depth = (t as { depth: number }).depth
      const text = (t as { text: string }).text
      if (depth === 2) {
        flush()
        inFaq = /frequently asked questions|^faqs?$/i.test(text.trim())
        continue
      }
      if (inFaq && depth === 3) {
        flush()
        current = { q: stripInlineMd(text), a: [] }
        continue
      }
    }
    if (!inFaq || !current) continue
    if (t.type === 'paragraph' || t.type === 'text') {
      current.a.push(stripInlineMd((t as { text: string }).text))
    } else if (t.type === 'list') {
      const items = ((t as { items?: { text: string }[] }).items ?? [])
        .map((it) => stripInlineMd(it.text))
        .join('. ')
      if (items) current.a.push(items)
    }
  }
  flush()
  return faqs
}

// The site owner writes the posts; show their headshot unless a post overrides it.
const OWNER = 'Eimantas Kudarauskas'
const OWNER_PHOTO = '/ceo.webp'
const OWNER_LINKEDIN = 'https://www.linkedin.com/in/ekudarauskas/'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

/** Minimal `key: value` frontmatter parser for our own trusted .md files. */
function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data: Record<string, string> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) data[key] = val
  }
  return { data, body: m[2] }
}

function fileToPost(filename: string): BlogPost {
  const raw = readFileSync(join(BLOG_DIR, filename), 'utf8')
  const { data, body } = parseFrontmatter(raw)
  const author = data.author ?? 'Loqara'
  const { html, headings } = renderBody(body)
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
    faq: extractFaq(body),
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
