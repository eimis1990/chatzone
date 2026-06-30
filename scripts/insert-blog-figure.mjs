#!/usr/bin/env node
/**
 * Insert one illustrative <figure> right after a post's key-takeaways box.
 * Idempotent: skips if the image is already referenced. Keeps image placement
 * consistent across the blog (matches the flagship Shopify post).
 *
 * Usage: node scripts/insert-blog-figure.mjs <file.md> <img-src> "<alt>" "<caption>"
 */
import { readFileSync, writeFileSync } from 'node:fs'

const [file, img, alt, caption] = process.argv.slice(2)
if (!file || !img || !alt || !caption) {
  console.error('Usage: insert-blog-figure.mjs <file.md> <img-src> "<alt>" "<caption>"')
  process.exit(1)
}

let s = readFileSync(file, 'utf8')
if (s.includes(img)) {
  console.log(`• already has figure: ${file}`)
  process.exit(0)
}
const start = s.indexOf('<div class="takeaways"')
if (start === -1) {
  console.error(`✗ no takeaways box in ${file}`)
  process.exit(1)
}
const close = s.indexOf('</div>', start)
if (close === -1) {
  console.error(`✗ unclosed takeaways box in ${file}`)
  process.exit(1)
}
const at = close + '</div>'.length
const fig = `\n\n<figure>\n<img src="${img}" alt="${alt}" width="1200" height="800" loading="lazy" />\n<figcaption>${caption}</figcaption>\n</figure>`
s = s.slice(0, at) + fig + s.slice(at)
writeFileSync(file, s)
console.log(`✓ inserted figure into ${file}`)
