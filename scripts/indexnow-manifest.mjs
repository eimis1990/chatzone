// Content manifest for IndexNow delta submissions (SEO/GEO plan task 6.3).
//
// Maps every indexable public URL to a hash of the source that renders it.
// The manifest is written to public/ BEFORE `next build` (see the build
// script), so every deployment serves its own manifest at
// /indexnow-manifest.json. The post-build ping then fetches the LIVE site's
// manifest (still the previous deployment while the build runs), diffs, and
// submits only the URLs whose content actually changed.
//
// Hash sources:
// - /blog/<slug>       → the markdown file
// - /blog              → the ordered slug list (changes when posts are added/removed)
// - /blog/topics/<t>   → members' frontmatter (title/date/image edits re-ping the hub)
// - static pages       → their page.tsx (content lives in the component)
//
// Run `node scripts/indexnow-manifest.mjs --write` to (re)generate the file.

import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.loqara.com').replace(/\/+$/, '')

const sha = (s) => createHash('sha1').update(s).digest('hex')

function frontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? m[1] : ''
}

/** URL → content hash for every indexable public page. */
export function buildManifest(root = process.cwd()) {
  const manifest = {}
  const blogDir = join(root, 'content', 'blog')

  const posts = readdirSync(blogDir)
    .filter((f) => /\.mdx?$/.test(f))
    .sort()
    .map((f) => {
      const raw = readFileSync(join(blogDir, f), 'utf8')
      const slug = f.replace(/\.mdx?$/, '')
      return { slug, raw, fm: frontmatter(raw) }
    })

  for (const p of posts) manifest[`${SITE_URL}/blog/${p.slug}`] = sha(p.raw)
  manifest[`${SITE_URL}/blog`] = sha(posts.map((p) => p.slug).join('\n'))

  const byTopic = new Map()
  for (const p of posts) {
    const topic = (p.fm.match(/^topic:\s*(.+)$/m) ?? [])[1]?.trim()
    if (!topic) continue
    if (!byTopic.has(topic)) byTopic.set(topic, [])
    byTopic.get(topic).push(`${p.slug}:${sha(p.fm)}`)
  }
  for (const [topic, members] of byTopic) {
    manifest[`${SITE_URL}/blog/topics/${topic}`] = sha(members.sort().join('\n'))
  }

  const staticPages = {
    '/': 'app/page.tsx',
    '/about': 'app/about/page.tsx',
    '/authors/eimantas-kudarauskas': 'app/authors/eimantas-kudarauskas/page.tsx',
    '/editorial-policy': 'app/editorial-policy/page.tsx',
    '/review-methodology': 'app/review-methodology/page.tsx',
    '/privacy': 'app/privacy/page.tsx',
    '/terms': 'app/terms/page.tsx',
  }
  for (const [path, file] of Object.entries(staticPages)) {
    manifest[`${SITE_URL}${path}`] = sha(readFileSync(join(root, file), 'utf8'))
  }

  return manifest
}

/** URLs whose content changed or that are new, plus URLs that disappeared. */
export function diffManifests(previous, current) {
  const changed = Object.keys(current).filter((url) => previous[url] !== current[url])
  const deleted = Object.keys(previous).filter((url) => !(url in current))
  return { changed, deleted }
}

if (process.argv.includes('--write')) {
  const manifest = buildManifest()
  writeFileSync(
    join(process.cwd(), 'public', 'indexnow-manifest.json'),
    JSON.stringify(manifest, null, 1) + '\n',
  )
  console.log(`[indexnow-manifest] wrote ${Object.keys(manifest).length} entries`)
}
