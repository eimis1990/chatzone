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
  author: string
  /** Author's role/title, shown next to their name. */
  authorRole: string
  /** Optional hero image path (under /public), e.g. /blog/foo.webp. */
  image?: string
  /** Estimated reading time in minutes. */
  readingMinutes: number
  /** Rendered HTML body (frontmatter stripped). */
  html: string
}

/** Rough reading time at ~200 words/min, floored at 1. */
function readingTime(markdown: string): number {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

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
  return {
    slug: filename.replace(/\.mdx?$/, ''),
    title: data.title ?? 'Untitled',
    description: data.description ?? '',
    date: data.date ?? '1970-01-01',
    author: data.author ?? 'Loqara',
    authorRole: data.authorRole ?? 'Founder',
    image: data.image || undefined,
    readingMinutes: readingTime(body),
    html: marked.parse(body, { async: false }) as string,
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
