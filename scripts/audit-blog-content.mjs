#!/usr/bin/env node
/**
 * Blog content audit (SEO/GEO plan task 5.7). Reports objective content-state
 * problems and exits non-zero only for ERRORS; WARNINGS are editorial review
 * prompts. This script checks structure, not truth: it cannot judge whether
 * prose is helpful or whether a cited source supports a claim — those remain
 * human review gates (design §6.6).
 *
 * Usage: node scripts/audit-blog-content.mjs   (npm run audit:blog)
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')
const PUBLIC_DIR = join(process.cwd(), 'public')
const TOPIC_SLUGS = [
  'ai-customer-support',
  'ecommerce-ai',
  'platform-integrations',
  'voice-ai',
  'ai-search-visibility',
  'vendor-comparisons',
]
// Real calendar day in yyyy-mm-dd (regex alone lets "2026-13-99" through).
const isIsoDay = (v) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}
const REQUIRED_KEYS = ['title', 'description', 'date', 'author', 'image', 'topic']

// Posts human-reviewed in the 2026-07-21 citation sweep (plan task 5.5) and
// found deliberately citation-free: first-party how-tos and operational advice
// with no borrowed statistics. Suppresses only the no-external-citations
// warning; remove a slug here if the post gains factual/statistical claims.
const CITATION_EXCEPTIONS = new Set([
  'add-voice-ai-to-online-store',
  'ai-chatbot-human-handoff',
  'ai-product-recommendation-chatbot',
  'capture-leads-with-conversational-chat',
  'chatbot-roi-metrics-that-matter',
  'conversational-ai-vs-chatbot',
  'reduce-support-tickets-with-ai',
  'voice-ai-for-ecommerce-support',
  'where-is-my-order-ai',
])

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!m) return { data: {}, body: raw }
  const data = {}
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    if (key) data[key] = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
  }
  return { data, body: m[2] }
}

const errors = []
const warnings = []
const posts = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const { data, body } = parseFrontmatter(readFileSync(join(BLOG_DIR, f), 'utf8'))
    return { slug: f.replace(/\.md$/, ''), data, body }
  })
const slugs = new Set(posts.map((p) => p.slug))

// -- duplicates ---------------------------------------------------------------
for (const field of ['title', 'description']) {
  const seen = new Map()
  for (const p of posts) {
    const v = (p.data[field] ?? '').toLowerCase()
    if (!v) continue
    if (seen.has(v)) errors.push(`duplicate ${field}: ${seen.get(v)} and ${p.slug}`)
    else seen.set(v, p.slug)
  }
}

// -- per-post structural checks -----------------------------------------------
for (const p of posts) {
  const { slug, data, body } = p

  for (const k of REQUIRED_KEYS) {
    if (!data[k]) errors.push(`${slug}: missing frontmatter "${k}"`)
  }
  if (data.date && !isIsoDay(data.date)) errors.push(`${slug}: invalid date "${data.date}"`)
  if (data.updated) {
    if (!isIsoDay(data.updated)) errors.push(`${slug}: invalid updated "${data.updated}"`)
    else if (data.date && data.updated < data.date)
      errors.push(`${slug}: updated ${data.updated} earlier than date ${data.date}`)
  }
  if (data.topic && !TOPIC_SLUGS.includes(data.topic))
    errors.push(`${slug}: unknown topic "${data.topic}"`)
  if (data.image && !existsSync(join(PUBLIC_DIR, data.image)))
    errors.push(`${slug}: image file not found: ${data.image}`)

  // Body images must exist too.
  for (const m of body.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/g)) {
    if (!existsSync(join(PUBLIC_DIR, m[1]))) errors.push(`${slug}: body image not found: ${m[1]}`)
  }

  // Internal blog links must resolve.
  const outbound = new Set()
  for (const m of body.matchAll(/\]\(\/blog\/([a-z0-9-]+)(?:#[^)]*)?\)/g)) {
    if (!slugs.has(m[1])) errors.push(`${slug}: broken internal link /blog/${m[1]}`)
    else if (m[1] !== slug) outbound.add(m[1])
  }
  if (outbound.size < 2)
    warnings.push(`${slug}: only ${outbound.size} contextual outbound blog link(s) — needs editorial linking or a documented exception`)

  // Related slugs: must exist, not self, not duplicated.
  const related = (data.related ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (related.length === 0) warnings.push(`${slug}: no curated related: slugs (falls back to same-topic recency)`)
  if (new Set(related).size !== related.length) errors.push(`${slug}: duplicate related slugs`)
  for (const r of related) {
    if (r === slug) errors.push(`${slug}: related links to itself`)
    else if (!slugs.has(r)) errors.push(`${slug}: related slug does not exist: ${r}`)
  }

  // Editorial template sections (warnings — humans decide whether they're required).
  if (!/class="quick-answer"|^##\s+Quick answer/im.test(body))
    warnings.push(`${slug}: no quick-answer block — confirm the template exception`)
  const hasExternalLink = /\]\(https?:\/\/(?!www\.loqara\.com)[^)]+\)/.test(body)
  if (!hasExternalLink && !CITATION_EXCEPTIONS.has(slug))
    warnings.push(`${slug}: no external citations — review claims per task 5.5`)
}

// -- inbound link graph ---------------------------------------------------------
const inbound = new Map([...slugs].map((s) => [s, 0]))
for (const p of posts) {
  for (const m of p.body.matchAll(/\]\(\/blog\/([a-z0-9-]+)(?:#[^)]*)?\)/g)) {
    if (m[1] !== p.slug && inbound.has(m[1])) inbound.set(m[1], inbound.get(m[1]) + 1)
  }
}
for (const [slug, n] of inbound) {
  if (n === 0) warnings.push(`${slug}: zero contextual inbound links from other posts`)
}

// -- report ---------------------------------------------------------------------
console.log(`audited ${posts.length} posts`)
if (errors.length) {
  console.log(`\nERRORS (${errors.length}) — objective broken state, fix before release:`)
  for (const e of errors) console.log(`  ✖ ${e}`)
}
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}) — editorial review needed:`)
  for (const w of warnings) console.log(`  ⚠ ${w}`)
}
if (!errors.length) console.log(`\nno errors${warnings.length ? ` (${warnings.length} warnings)` : ' or warnings'}`)
process.exit(errors.length ? 1 : 0)
