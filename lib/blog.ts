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
  /** Q&A pulled from the post's "Frequently asked questions" section, for FAQ schema. */
  faq: FaqItem[]
}

export interface FaqItem {
  question: string
  answer: string
}

/** Rough reading time at ~200 words/min, floored at 1. */
function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Render Markdown to HTML, then wrap tables so wide ones scroll on mobile. */
function renderBody(body: string): string {
  const html = marked.parse(body, { async: false }) as string
  return html
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>')
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
  return {
    slug: filename.replace(/\.mdx?$/, ''),
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    date: data.date ?? '1970-01-01',
    updated: data.updated || undefined,
    author,
    authorRole: data.authorRole ?? 'Founder',
    authorImage: data.authorImage || (author === OWNER ? OWNER_PHOTO : undefined),
    image: data.image || undefined,
    readingMinutes: readingTime(body),
    html: renderBody(body),
    faq: extractFaq(body),
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

export function getPostBySlug(slug: string): BlogPost | null {
  return getAllPosts().find((p) => p.slug === slug) ?? null
}
